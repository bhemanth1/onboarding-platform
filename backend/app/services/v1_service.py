"""
Versioned BRD API service backed by the PostgreSQL onboarding schema.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from ..config import settings
from ..database.db import get_db_connection
from ..database.postgres import execute, fetch_row, fetch_rows, postgres_enabled
from .mvp_read_service import MvpReadService


class V1Service:
    """BRD-style endpoints that expose focused resources under /api/v1."""

    async def kpis(self) -> dict:
        if not postgres_enabled():
            data = await MvpReadService().dashboard()
            return data["metrics"]
        row = await fetch_row(
            """
            SELECT
              COUNT(*)::int AS total_cases,
              COUNT(*) FILTER (WHERE status NOT IN ('completed', 'withdrawn'))::int AS active_cases,
              COUNT(*) FILTER (WHERE COALESCE(is_completed, FALSE) = TRUE OR status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'at_risk')::int AS at_risk,
              COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked,
              COUNT(*) FILTER (WHERE status = 'pending_hil')::int AS pending_hil,
              COUNT(*) FILTER (WHERE status IN ('in_progress', 'active'))::int AS in_progress,
              COUNT(*) FILTER (WHERE COALESCE(sla_breach, FALSE) = TRUE)::int AS sla_breaches,
              COALESCE(ROUND(AVG(overall_progress)), 0)::int AS avg_progress,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE COALESCE(is_completed, FALSE) = TRUE OR status = 'completed')
                / NULLIF(COUNT(*), 0),
                1
              ) AS completion_rate_pct
            FROM onboarding_cases
            """
        )
        exceptions = await fetch_row(
            """
            SELECT COUNT(*)::int AS open_exceptions
            FROM hil_gates
            WHERE decision = 'pending' AND COALESCE(is_blocking, FALSE) = TRUE
            """
        )
        data = dict(row or {})
        data["open_exceptions"] = (exceptions or {}).get("open_exceptions", 0)
        return _serialise(data)

    async def cases(self) -> list[dict]:
        if not postgres_enabled():
            return await MvpReadService().cases()
        rows = await fetch_rows(
            """
            SELECT
              oc.id AS case_uuid,
              oc.case_number,
              oc.employee_id,
              oc.phase,
              oc.status,
              oc.is_completed,
              oc.pre_onboarding_progress,
              oc.onboarding_progress,
              oc.post_onboarding_progress,
              oc.overall_progress,
              oc.it_status,
              oc.docs_status,
              oc.sla_breach,
              c.first_name,
              c.last_name,
              c.role,
              c.department,
              c.joining_date,
              hg.decision AS hr_verification_decision
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            LEFT JOIN LATERAL (
              SELECT decision
              FROM hil_gates
              WHERE case_id = oc.id AND gate_type = 'doc_bg_verification'
              ORDER BY created_at DESC
              LIMIT 1
            ) hg ON TRUE
            ORDER BY c.joining_date ASC, oc.created_at DESC
            """
        )
        cases = []
        for index, row in enumerate(rows):
            first = row["first_name"] or ""
            last = row["last_name"] or ""
            name = f"{first} {last}".strip() or row["employee_id"] or row["case_number"]
            status = self._ui_status(row["status"], row["is_completed"], row["sla_breach"], row["hr_verification_decision"])
            phase = self._phase_label(row["phase"])
            progress = row["overall_progress"] or row["onboarding_progress"] or row["pre_onboarding_progress"] or 0
            docs = self._label(row["docs_status"])
            if row["hr_verification_decision"]:
                docs = f"HR {self._label(row['hr_verification_decision'])}"
            cases.append({
                "id": row["employee_id"] or row["case_number"],
                "caseId": row["case_number"],
                "caseUuid": str(row["case_uuid"]),
                "employee_id": row["employee_id"],
                "name": name,
                "ini": f"{first[:1]}{last[:1]}".upper() or "AE",
                "role": row["role"] or "New Joiner",
                "dept": row["department"] or "Onboarding",
                "phase": phase,
                "phaseKey": row["phase"],
                "st": status,
                "rawStatus": row["status"],
                "isCompleted": bool(row["is_completed"]),
                "join": _serialise(row["joining_date"]),
                "prog": progress,
                "it": self._label(row["it_status"]),
                "docs": docs,
                "backgroundVerification": row["hr_verification_decision"],
                "scenario": self._scenario(status, phase),
                "slaLabel": "SLA Watch" if status in {"blocked", "at-risk"} else "On Track",
                "riskScore": self._risk_score(status, progress),
                "col": ["#0E2E89", "#16A34A", "#E4902E", "#22D3EE", "#7C3AED", "#E11D48", "#CF008B", "#0E766E"][index % 8],
            })
        return cases

    async def profiles(self) -> list[dict]:
        if not postgres_enabled():
            conn = get_db_connection()
            try:
                rows = conn.execute(
                    """
                    SELECT role_name, display_name, initials, color, sort_order
                    FROM role_profiles
                    WHERE COALESCE(is_active, 1) = 1
                    ORDER BY sort_order ASC, role_name ASC
                    """
                ).fetchall()
                return [_profile_dict(dict(row)) for row in rows]
            finally:
                conn.close()

        await self._ensure_role_profiles()
        rows = await fetch_rows(
            """
            SELECT role_name, display_name, initials, color, sort_order
            FROM role_profiles
            WHERE COALESCE(is_active, TRUE) = TRUE
            ORDER BY sort_order ASC, role_name ASC
            """
        )
        return [_profile_dict(dict(row)) for row in rows]

    async def case_detail(self, case_ref: str) -> dict:
        cases = await self.cases()
        case = next(
            (
                item
                for item in cases
                if case_ref in {item.get("id"), item.get("caseId"), item.get("caseUuid")}
            ),
            None,
        )
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        case["timeline"] = await MvpReadService().audit(case_ref=case_ref, limit=50)
        case["hil_gates"] = [gate for gate in await self.hil_gates() if gate["case_number"] == case["caseId"]]
        return case

    async def hil_gates(self) -> list[dict]:
        return await MvpReadService().hil_gates()

    async def hil_stats(self) -> dict:
        rows = await self.hil_gates()
        counts: dict[str, int] = {}
        for gate in rows:
            decision = gate.get("decision") or "unknown"
            counts[decision] = counts.get(decision, 0) + 1
        return {"total": len(rows), **counts}

    async def audit_live(self, limit: int = 50) -> list[dict]:
        return await MvpReadService().audit(limit=limit)

    async def pre_onboarding_tasks(self, case_ref: str | None = None) -> list[dict]:
        where, args = self._case_filter(case_ref)
        rows = await fetch_rows(
            f"""
            SELECT
              pot.id, pot.task_type, pot.assigned_team, pot.description, pot.due_date,
              pot.status, pot.sla_compliant, pot.created_at, oc.case_number, oc.employee_id
            FROM pre_onboarding_tasks pot
            JOIN onboarding_cases oc ON oc.id = pot.case_id
            {where}
            ORDER BY pot.due_date ASC, pot.created_at DESC
            """,
            *args,
        )
        return _serialise_rows(rows)

    async def follow_ups(self, case_ref: str | None = None) -> list[dict]:
        where, args = self._case_filter(case_ref)
        rows = await fetch_rows(
            f"""
            SELECT
              fu.id, fu.follow_up_type, fu.scheduled_at, fu.sent_at, fu.channel,
              fu.response_status, fu.responded_at, fu.notes, oc.case_number, oc.employee_id
            FROM follow_ups fu
            JOIN onboarding_cases oc ON oc.id = fu.case_id
            {where}
            ORDER BY fu.scheduled_at ASC
            """,
            *args,
        )
        return _serialise_rows(rows)

    async def documents(self, case_ref: str) -> list[dict]:
        case = await self._find_case(case_ref)
        rows = await fetch_rows(
            """
            SELECT *
            FROM documents
            WHERE case_id = $1
            ORDER BY COALESCE(submitted_at, created_at) DESC
            """,
            case["id"],
        )
        return _serialise_rows(rows)

    async def create_document(self, case_ref: str, payload: dict[str, Any]) -> dict:
        case = await self._find_case(case_ref)
        document_type = payload.get("document_type") or payload.get("type") or "pre_onboarding_document"
        status = payload.get("status") or "submitted"
        columns = await table_columns("documents")
        values: dict[str, Any] = {
            "case_id": case["id"],
            "candidate_id": case["candidate_id"],
            "document_type": document_type,
            "file_name": payload.get("file_name") or payload.get("name") or f"{document_type}.pdf",
            "status": status,
            "submitted_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        insert_cols = [key for key in values if key in columns]
        placeholders = ", ".join(f"${index}" for index in range(1, len(insert_cols) + 1))
        row = await fetch_row(
            f"""
            INSERT INTO documents ({", ".join(insert_cols)})
            VALUES ({placeholders})
            RETURNING *
            """,
            *[values[key] for key in insert_cols],
        )
        await self.recalculate_and_save_progress(str(case["id"]))
        return _serialise(dict(row))

    async def provisioning(self, case_ref: str) -> list[dict]:
        case = await self._find_case(case_ref)
        rows = await fetch_rows(
            """
            SELECT *
            FROM provisioning_items
            WHERE case_id = $1
            ORDER BY created_at DESC
            """,
            case["id"],
        )
        return _serialise_rows(rows)

    async def post_onboarding(self, case_ref: str | None = None) -> list[dict]:
        where, args = self._case_filter(case_ref)
        rows = await fetch_rows(
            f"""
            SELECT poi.*, oc.case_number, oc.employee_id
            FROM post_onboarding_items poi
            JOIN onboarding_cases oc ON oc.id = poi.case_id
            {where}
            ORDER BY poi.created_at DESC
            """,
            *args,
        )
        return _serialise_rows(rows)

    async def reports(self, report_id: str) -> dict:
        mvp = MvpReadService()
        analytics = mvp.analytics_from_cases(await mvp.cases())
        kpis = await self.kpis()
        if report_id == "r01-pipeline":
            return {"report": report_id, "kpis": kpis, "by_phase": analytics["byPhase"], "by_status": analytics["byStatus"]}
        if report_id == "r02-documents":
            return {"report": report_id, "document_validation": analytics["byBackgroundVerification"]}
        if report_id == "r03-provisioning":
            rows = await fetch_rows("SELECT status, COUNT(*)::int AS count FROM provisioning_items GROUP BY status ORDER BY status")
            return {"report": report_id, "provisioning": _serialise_rows(rows)}
        if report_id == "r04-sla":
            rows = await fetch_rows("SELECT phase, COUNT(*)::int AS breaches FROM onboarding_cases WHERE sla_breach = TRUE GROUP BY phase ORDER BY phase")
            return {"report": report_id, "sla": _serialise_rows(rows), "open_exceptions": kpis.get("open_exceptions", 0)}
        raise HTTPException(status_code=404, detail="Unknown report")

    async def create_candidate(self, payload: dict[str, Any]) -> dict:
        first_name = payload.get("first_name") or payload.get("firstName")
        last_name = payload.get("last_name") or payload.get("lastName")
        email = payload.get("personal_email") or payload.get("email")
        if not first_name or not last_name or not email:
            raise HTTPException(status_code=422, detail="first_name, last_name, and personal_email/email are required")

        candidate = await fetch_row(
            """
            INSERT INTO candidates (
              first_name, last_name, personal_email, phone, role, department,
              manager_name, joining_date, employee_type, office_location, nationality,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING *
            """,
            first_name,
            last_name,
            email,
            payload.get("phone") or "",
            payload.get("role") or "New Joiner",
            payload.get("department") or "General",
            payload.get("manager_name") or payload.get("managerName") or "HR Coordinator",
            payload.get("joining_date") or payload.get("joiningDate") or date.today() + timedelta(days=7),
            payload.get("employee_type") or "new_hire",
            payload.get("office_location") or "Hyderabad, IN",
            payload.get("nationality") or "",
        )
        sequence = await fetch_row("SELECT COUNT(*)::int + 1 AS next_number FROM onboarding_cases")
        case_number = payload.get("case_number") or f"OB-2026-{sequence['next_number']:04d}"
        employee_id = payload.get("employee_id") or f"EMP-2026-{sequence['next_number']:05d}"
        case = await fetch_row(
            """
            INSERT INTO onboarding_cases (
              case_number, candidate_id, employee_id, phase, status,
              pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
              overall_progress, it_status, docs_status, payroll_status, pf_status,
              is_completed, sla_breach, created_at, updated_at
            )
            VALUES ($1, $2, $3, 'pre_onboarding', 'active', 0, 0, 0, 0,
                    'not_started', 'not_submitted', 'not_started', 'not_started',
                    FALSE, FALSE, NOW(), NOW())
            RETURNING *
            """,
            case_number,
            candidate["id"],
            employee_id,
        )
        await self._seed_trigger_records(case, candidate)
        return {"candidate": _serialise(dict(candidate)), "case": _serialise(dict(case))}

    async def recalculate_and_save_progress(self, case_ref: str) -> dict:
        case = await self._find_case(case_ref)
        case_id = case["id"]
        pre = await _completion_percent("pre_onboarding_tasks", case_id, "status = 'completed'")
        docs = await _completion_percent("documents", case_id, "status IN ('validated', 'approved', 'verified')")
        provisioning = await _completion_percent("provisioning_items", case_id, "status = 'completed'")
        post = await self._post_onboarding_percent(case_id)
        onboarding_parts = [value for value in [docs, provisioning] if value is not None]
        onboarding = round(sum(onboarding_parts) / len(onboarding_parts)) if onboarding_parts else 0
        overall = round((pre + onboarding + post) / 3)
        pending_hil = await fetch_row(
            "SELECT COUNT(*)::int AS total FROM hil_gates WHERE case_id = $1 AND decision = 'pending' AND COALESCE(is_blocking, FALSE) = TRUE",
            case_id,
        )
        status = "pending_hil" if (pending_hil or {}).get("total", 0) else case["status"]
        await execute(
            """
            UPDATE onboarding_cases
            SET pre_onboarding_progress = $1,
                onboarding_progress = $2,
                post_onboarding_progress = $3,
                overall_progress = $4,
                status = $5,
                updated_at = NOW()
            WHERE id = $6
            """,
            pre,
            onboarding,
            post,
            overall,
            status,
            case_id,
        )
        return {"case_number": case["case_number"], "pre_onboarding_progress": pre, "onboarding_progress": onboarding, "post_onboarding_progress": post, "overall_progress": overall, "status": status}

    async def sync_hil_case_statuses(self) -> dict:
        result = await execute(
            """
            UPDATE onboarding_cases oc
            SET status = 'pending_hil', updated_at = NOW()
            WHERE EXISTS (
              SELECT 1 FROM hil_gates hg
              WHERE hg.case_id = oc.id AND hg.decision = 'pending' AND COALESCE(hg.is_blocking, FALSE) = TRUE
            )
            AND oc.status <> 'pending_hil'
            """
        )
        return {"status": "synced", "result": result}

    async def _seed_trigger_records(self, case, candidate) -> None:
        for task_type, team, description in [
            ("laptop_setup", "it", "Laptop allocation for new joiner"),
            ("email_id_creation", "it", "Corporate email creation"),
            ("desk_allocation", "admin", "Desk allocation"),
            ("id_card_preparation", "admin", "ID card preparation"),
        ]:
            await execute(
                """
                INSERT INTO pre_onboarding_tasks (case_id, task_type, assigned_team, description, due_date, status, sla_compliant, created_at)
                VALUES ($1, $2, $3, $4, $5, 'in_progress', TRUE, NOW())
                """,
                case["id"],
                task_type,
                team,
                description,
                date.today() + timedelta(days=3),
            )
        for follow_type, days in [("7_day", 7), ("3_day", 3), ("0_day", 0)]:
            await execute(
                """
                INSERT INTO follow_ups (case_id, follow_up_type, scheduled_at, channel, response_status, notes, created_at)
                VALUES ($1, $2, $3, 'email', 'pending', 'Auto-created by candidate trigger', NOW())
                """,
                case["id"],
                follow_type,
                datetime.utcnow() + timedelta(days=days),
            )
        await execute(
            """
            INSERT INTO audit_logs (
              case_id, candidate_id, employee_id, phase, event_type, rule_ref,
              rule_version, event_description, outcome, agent_id, created_at
            )
            VALUES ($1, $2, $3, 'pre_onboarding', 'trigger', NULL, NULL, $4, 'created', $5, NOW())
            """,
            case["id"],
            candidate["id"],
            case["employee_id"],
            f"Pre-onboarding workflow triggered for {candidate['first_name']} {candidate['last_name']}.",
            settings.AGENT_ID,
        )

    async def _ensure_role_profiles(self) -> None:
        await execute(
            """
            CREATE TABLE IF NOT EXISTS role_profiles (
              role_name VARCHAR(100) PRIMARY KEY,
              display_name VARCHAR(150) NOT NULL,
              initials VARCHAR(10),
              color VARCHAR(20),
              sort_order INT,
              is_active BOOLEAN DEFAULT TRUE,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )

    async def _find_case(self, case_ref: str):
        row = await fetch_row(
            """
            SELECT *
            FROM onboarding_cases
            WHERE case_number = $1 OR employee_id = $1 OR id::text = $1
            LIMIT 1
            """,
            case_ref,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Case not found")
        return row

    @staticmethod
    def _case_filter(case_ref: str | None) -> tuple[str, list[Any]]:
        if not case_ref:
            return "", []
        return "WHERE oc.case_number = $1 OR oc.employee_id = $1 OR oc.id::text = $1", [case_ref]

    @staticmethod
    def _label(value: str | None) -> str:
        return (value or "not_started").replace("_", " ").title()

    @staticmethod
    def _phase_label(value: str | None) -> str:
        return {
            "pre_onboarding": "Pre-Onboarding",
            "onboarding": "Onboarding",
            "post_onboarding": "Post-Onboarding",
            "completed": "Completed",
        }.get(value or "", V1Service._label(value))

    @staticmethod
    def _ui_status(status: str | None, is_completed: bool, sla_breach: bool, hr_decision: str | None) -> str:
        if is_completed or status == "completed":
            return "completed"
        if hr_decision == "pending" or status == "pending_hil":
            return "hil"
        if hr_decision == "rejected" or status == "blocked":
            return "blocked"
        if sla_breach or status == "at_risk":
            return "at-risk"
        return {"in_progress": "in-progress", "active": "in-progress"}.get(status or "", status or "in-progress")

    @staticmethod
    def _scenario(status: str, phase: str) -> str:
        if status == "hil":
            return "Awaiting HR approval"
        if status == "blocked":
            return "Blocked exception"
        if status == "at-risk":
            return "SLA at risk"
        if status == "completed":
            return "Completed onboarding"
        if phase == "Pre-Onboarding":
            return "Pre-boarding in progress"
        if phase == "Post-Onboarding":
            return "Post-boarding checklist"
        return "Normal onboarding"

    @staticmethod
    def _risk_score(status: str, progress: int) -> int:
        base = {"completed": 5, "in-progress": 25, "hil": 55, "at-risk": 78, "blocked": 92}.get(status, 30)
        return min(99, base + max(0, 60 - int(progress or 0)) // 6)

    async def _post_onboarding_percent(self, case_id) -> int:
        row = await fetch_row("SELECT * FROM post_onboarding_items WHERE case_id = $1 LIMIT 1", case_id)
        if not row:
            return 0
        values = dict(row)
        bool_values = [value for key, value in values.items() if isinstance(value, bool) and key not in {"is_deleted"}]
        if not bool_values:
            return 0
        return round(100 * sum(1 for value in bool_values if value) / len(bool_values))


async def _completion_percent(table: str, case_id, complete_sql: str) -> int:
    row = await fetch_row(
        f"""
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE {complete_sql})::int AS completed
        FROM {table}
        WHERE case_id = $1
        """,
        case_id,
    )
    if not row or not row["total"]:
        return 0
    return round(100 * row["completed"] / row["total"])


async def table_columns(table: str) -> set[str]:
    rows = await fetch_rows(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        """,
        table,
    )
    return {row["column_name"] for row in rows}


def _serialise_rows(rows) -> list[dict]:
    return [_serialise(dict(row)) for row in rows]


def _profile_dict(row: dict) -> dict:
    return {
        "role": row.get("role_name"),
        "name": row.get("display_name"),
        "initials": row.get("initials") or _initials(row.get("display_name")),
        "color": row.get("color") or "#0E2E89",
        "sortOrder": row.get("sort_order") or 0,
    }


def _initials(name: str | None) -> str:
    parts = [part for part in (name or "").split() if part]
    if not parts:
        return "NA"
    return "".join(part[0] for part in parts[:2]).upper()


def _serialise(value):
    if isinstance(value, dict):
        return {key: _serialise(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialise(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value
