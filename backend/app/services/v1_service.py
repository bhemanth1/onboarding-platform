"""
Versioned BRD API service backed by the PostgreSQL onboarding schema.
"""
from __future__ import annotations

import csv
import io
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from ..config import settings
from ..database.db import get_db_connection
from ..database.postgres import APP_SCHEMA, execute, fetch_row, fetch_rows, postgres_enabled
from .mvp_read_service import MvpReadService

# UTC offsets for welcome-email timezone scheduling (hour at which 08:00 local = UTC)
_COUNTRY_UTC_OFFSET: dict[str, int] = {
    "India": -3,           # IST UTC+5:30 → 08:00 local = 02:30 UTC (stored as floor -3 approx)
    "Germany": -7,         # CET UTC+1 → 08:00 local = 07:00 UTC
    "Spain": -7,
    "France": -7,
    "United Kingdom": -8,  # GMT UTC+0 → 08:00 UTC
    "United States": 13,   # EST UTC-5 → 08:00 local = 13:00 UTC
    "China": -8,           # CST UTC+8 → 08:00 local = 00:00 UTC
    "South Korea": -8,
    "Japan": -8,
}


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
        # Detect which columns are present — migration may not have run yet.
        oc_cols = await table_columns("onboarding_cases")
        c_cols  = await table_columns("candidates")
        has_new_oc = "manager_notification_status" in oc_cols
        has_new_c  = "country_of_employment" in c_cols

        # Build optional column fragments so the query works before + after migrate_v2.sql
        oc_new_cols = (
            """
              COALESCE(oc.manager_notification_status, 'not_sent')           AS manager_notification_status,
              COALESCE(oc.welcome_email_status, 'not_sent')                  AS welcome_email_status,
              oc.statutory_form_type,
              COALESCE(oc.statutory_form_submission_status,'not_applicable')  AS statutory_form_submission_status,
              COALESCE(oc.tax_statutory_config_status,'not_started')          AS tax_statutory_config_status,
              COALESCE(oc.hr_signoff_status,'pending')                        AS hr_signoff_status,
              COALESCE(oc.it_admin_notification_failed, FALSE)                AS it_admin_notification_failed,
              COALESCE(oc.it_admin_action_item_open, FALSE)                   AS it_admin_action_item_open,
            """
            if has_new_oc else
            """
              'not_sent'::text      AS manager_notification_status,
              'not_sent'::text      AS welcome_email_status,
              NULL::text            AS statutory_form_type,
              'not_applicable'::text AS statutory_form_submission_status,
              'not_started'::text   AS tax_statutory_config_status,
              'pending'::text       AS hr_signoff_status,
              FALSE                 AS it_admin_notification_failed,
              FALSE                 AS it_admin_action_item_open,
            """
        )
        c_new_cols = (
            "c.country_of_employment, c.grade_band,"
            if has_new_c else
            "NULL::text AS country_of_employment, NULL::text AS grade_band,"
        )

        rows = await fetch_rows(
            f"""
            SELECT
              oc.id AS case_uuid,
              oc.case_number,
              oc.employee_id,
              oc.phase,
              oc.status,
              oc.is_completed,
              oc.completed_at,
              oc.pre_onboarding_progress,
              oc.onboarding_progress,
              oc.post_onboarding_progress,
              oc.overall_progress,
              oc.it_status,
              oc.docs_status,
              oc.payroll_status,
              oc.pf_status,
              oc.sla_breach,
              oc.sla_escalated_at,
              {oc_new_cols}
              c.first_name,
              c.last_name,
              c.role,
              c.department,
              c.manager_name,
              c.office_location,
              c.joining_date,
              {c_new_cols}
              doc.rejection_reason,
              doc.correction_instructions,
              hg.decision AS hr_verification_decision,
              poi.buddy_assigned,
              poi.manager_checkin,
              poi.policy_acknowledged,
              poi.payroll_confirmed,
              poi.pf_confirmed,
              fw.sent_at IS NOT NULL AS welcome_email_sent
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            LEFT JOIN LATERAL (
              SELECT rejection_reason, correction_instructions
              FROM documents
              WHERE case_id = oc.id
                AND (rejection_reason IS NOT NULL OR correction_instructions IS NOT NULL)
              ORDER BY COALESCE(validated_at, submitted_at, created_at) DESC
              LIMIT 1
            ) doc ON TRUE
            LEFT JOIN LATERAL (
              SELECT decision
              FROM hil_gates
              WHERE case_id = oc.id AND gate_type = 'doc_bg_verification'
              ORDER BY created_at DESC
              LIMIT 1
            ) hg ON TRUE
            LEFT JOIN LATERAL (
              SELECT buddy_assigned, manager_checkin, policy_acknowledged, payroll_confirmed, pf_confirmed
              FROM post_onboarding_items
              WHERE case_id = oc.id
              LIMIT 1
            ) poi ON TRUE
            LEFT JOIN LATERAL (
              SELECT sent_at
              FROM follow_ups
              WHERE case_id = oc.id AND follow_up_type = 't_plus_0'
              LIMIT 1
            ) fw ON TRUE
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
                "managerName": row.get("manager_name") or "",
                "owner": self._hr_owner(row["department"], row["office_location"]),
                "phase": phase,
                "phaseKey": row["phase"],
                "st": status,
                "rawStatus": row["status"],
                "isCompleted": bool(row["is_completed"]),
                "completedAt": _serialise(row.get("completed_at")),
                "join": _serialise(row["joining_date"]),
                "prog": progress,
                "it": self._label(row["it_status"]),
                "docs": docs,
                "payrollStatus": self._label(row.get("payroll_status")),
                "pfStatus": self._label(row.get("pf_status")),
                "rejectionReason": row["rejection_reason"],
                "correctionInstructions": row["correction_instructions"],
                "backgroundVerification": row["hr_verification_decision"],
                "buddyAssigned": bool(row.get("buddy_assigned") or False),
                "managerCheckin": bool(row.get("manager_checkin") or False),
                "policyAcknowledged": bool(row.get("policy_acknowledged") or False),
                "payrollConfirmed": bool(row.get("payroll_confirmed") or False),
                "pfConfirmed": bool(row.get("pf_confirmed") or False),
                "welcomeEmailSent": bool(row.get("welcome_email_sent") or False),
                "welcome_email_status": row.get("welcome_email_status") or "not_sent",
                "manager_notification_status": row.get("manager_notification_status") or "not_sent",
                "statutory_form_type": row.get("statutory_form_type"),
                "statutory_form_submission_status": row.get("statutory_form_submission_status") or "not_applicable",
                "tax_statutory_config_status": row.get("tax_statutory_config_status") or "not_started",
                "hr_signoff_status": row.get("hr_signoff_status") or "pending",
                "it_admin_notification_failed": bool(row.get("it_admin_notification_failed") or False),
                "it_admin_action_item_open": bool(row.get("it_admin_action_item_open") or False),
                "countryOfEmployment": row.get("country_of_employment"),
                "gradeBand": row.get("grade_band"),
                "sla_escalated_at": _serialise(row.get("sla_escalated_at")),
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
        case["documents"] = await self.documents(case_ref)
        case["followUps"] = await self.follow_ups(case_ref)
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
        await self._check_and_trigger_hil(case["id"])
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
        # Route to specific BRD report methods
        if report_id in ("r01-pipeline", "r01-overview", "r01"):
            return await self.report_r01_pipeline()
        if report_id in ("r03-documents", "r03"):
            return await self.report_r03_documents()
        if report_id in ("r04-post-onboarding", "r04"):
            return await self.report_r04_post_onboarding()
        if report_id in ("r06-hil-gates", "r06"):
            return await self.report_r06_hil()

        # Legacy / pass-through reports
        mvp = MvpReadService()
        analytics = mvp.analytics_from_cases(await mvp.cases())
        kpis = await self.kpis()
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

        raw_date = payload.get("joining_date") or payload.get("joiningDate")
        if isinstance(raw_date, str):
            from datetime import date as _date
            raw_date = _date.fromisoformat(raw_date)
        joining_date_value = raw_date or date.today() + timedelta(days=7)

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
            joining_date_value,
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

    async def consents(self, case_ref: str) -> list[dict]:
        case = await self._find_case(case_ref)
        rows = await fetch_rows(
            """
            SELECT id, processing_category, acknowledged_at, ip_address, template_version, created_at
            FROM consents
            WHERE case_id = $1
            ORDER BY processing_category ASC
            """,
            case["id"],
        )
        return _serialise_rows(rows)

    async def email_templates(self) -> list[dict]:
        rows = await fetch_rows(
            """
            SELECT id, template_name, version, content, approved_by, approved_at, is_active, created_at
            FROM email_templates
            ORDER BY template_name ASC, version DESC
            """
        )
        return _serialise_rows(rows)

    async def schedule_due_reminders(self) -> dict:
        """Mark follow-up reminders as sent if due; suppresses if docs submitted or case in pending_hil."""
        due = await fetch_rows(
            """
            SELECT fu.id, fu.follow_up_type, oc.status, oc.docs_status
            FROM follow_ups fu
            JOIN onboarding_cases oc ON oc.id = fu.case_id
            WHERE fu.scheduled_at <= NOW()
              AND fu.sent_at IS NULL
            """
        )
        sent, suppressed = 0, 0
        for row in due:
            if row["docs_status"] != "not_submitted" or row["status"] == "pending_hil":
                suppressed += 1
                continue
            await execute("UPDATE follow_ups SET sent_at = NOW() WHERE id = $1", row["id"])
            sent += 1
        return {"sent": sent, "suppressed": suppressed}

    async def start_sla_clocks_for_new_pending_hil(self) -> dict:
        """Start the 4-business-hour SLA clock for cases that just entered pending_hil."""
        result = await execute(
            """
            UPDATE onboarding_cases
            SET sla_pending_hil_started_at = NOW(), updated_at = NOW()
            WHERE status = 'pending_hil'
              AND sla_pending_hil_started_at IS NULL
            """
        )
        return {"result": result}

    async def check_sla_breaches(self) -> dict:
        """Evaluate 4-business-hour SLA for pending_hil cases; escalate at 75%, breach at 100%."""
        rows = await fetch_rows(
            """
            SELECT id, case_number, employee_id, candidate_id,
                   sla_pending_hil_started_at, sla_escalated_at, sla_breach
            FROM onboarding_cases
            WHERE status = 'pending_hil'
              AND sla_pending_hil_started_at IS NOT NULL
              AND (sla_breach = FALSE OR sla_escalated_at IS NULL)
            """
        )
        now = datetime.utcnow()
        escalated, breached = 0, 0
        for row in rows:
            started = row["sla_pending_hil_started_at"]
            if isinstance(started, str):
                started = datetime.fromisoformat(started)
            elapsed = _business_hours_elapsed(started, now)
            case_id = row["id"]
            if elapsed >= 4.0 and not row["sla_breach"]:
                await execute(
                    "UPDATE onboarding_cases SET sla_breach = TRUE, updated_at = NOW() WHERE id = $1",
                    case_id,
                )
                await execute(
                    """
                    INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                      rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                    VALUES ($1, $2, $3, 'onboarding', 'sla_breach', 'BR002-SLA', 'V6', $4, 'breached', $5, NOW())
                    """,
                    case_id, row["candidate_id"], row["employee_id"],
                    f"4-business-hour SLA breached for case {row['case_number']}.",
                    settings.AGENT_ID,
                )
                breached += 1
            elif elapsed >= 3.0 and not row["sla_escalated_at"]:
                await execute(
                    "UPDATE onboarding_cases SET sla_escalated_at = NOW(), updated_at = NOW() WHERE id = $1",
                    case_id,
                )
                await execute(
                    """
                    INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                      rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                    VALUES ($1, $2, $3, 'onboarding', 'sla_75_escalation', 'BR002-SLA', 'V6', $4, 'escalated', $5, NOW())
                    """,
                    case_id, row["candidate_id"], row["employee_id"],
                    f"75% SLA threshold reached for case {row['case_number']}. Escalation triggered.",
                    settings.AGENT_ID,
                )
                escalated += 1
        return {"checked": len(rows), "escalated": escalated, "breached": breached}

    # ── B1: HOLD_LATE_SUBMISSION auto-flag ──────────────────────────
    async def flag_late_submissions(self) -> dict:
        """Flag cases as HOLD_LATE_SUBMISSION when joining date has passed and docs not yet submitted."""
        rows = await fetch_rows(
            """
            SELECT oc.id, oc.case_number, oc.employee_id, oc.candidate_id
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE c.joining_date <= CURRENT_DATE
              AND oc.docs_status IN ('not_submitted', 'not_started', 'partial')
              AND oc.status NOT IN ('HOLD_LATE_SUBMISSION', 'REJECTED', 'CANCELLED', 'COMPLETE',
                                    'completed', 'blocked')
            """
        )
        flagged = 0
        for row in rows:
            await execute(
                "UPDATE onboarding_cases SET status = 'HOLD_LATE_SUBMISSION', updated_at = NOW() WHERE id = $1",
                row["id"],
            )
            await execute(
                """
                INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                  rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                VALUES ($1, $2, $3, 'onboarding', 'hold_late_submission', 'BR001-LATE', 'V6',
                        $4, 'HOLD_LATE_SUBMISSION', $5, NOW())
                """,
                row["id"], row["candidate_id"], row["employee_id"],
                f"Joining date passed without document submission for {row['case_number']}.",
                settings.AGENT_ID,
            )
            flagged += 1
        return {"flagged": flagged}

    # ── B2: Manager notification dispatch ───────────────────────────
    async def dispatch_manager_notifications(self) -> dict:
        """Send manager notification 15 minutes after joining date (t_plus_0)."""
        rows = await fetch_rows(
            """
            SELECT oc.id, oc.case_number, oc.employee_id, oc.candidate_id
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE c.joining_date <= CURRENT_DATE
              AND oc.manager_notification_status = 'not_sent'
              AND oc.status NOT IN ('REJECTED', 'CANCELLED', 'COMPLETE', 'completed')
              AND oc.created_at <= NOW() - INTERVAL '15 minutes'
            """
        )
        dispatched = 0
        for row in rows:
            await execute(
                """
                UPDATE onboarding_cases
                SET manager_notification_status = 'sent', updated_at = NOW()
                WHERE id = $1
                """,
                row["id"],
            )
            await execute(
                """
                INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                  rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                VALUES ($1, $2, $3, 'onboarding', 'manager_notification_sent', 'BR001-MGR', 'V6',
                        $4, 'sent', $5, NOW())
                """,
                row["id"], row["candidate_id"], row["employee_id"],
                f"Manager notification dispatched for {row['case_number']}.",
                settings.AGENT_ID,
            )
            dispatched += 1
        return {"dispatched": dispatched}

    # ── B3: Timezone-aware welcome email ────────────────────────────
    async def send_welcome_emails(self) -> dict:
        """Send welcome emails at 08:00 local time per country_of_employment."""
        now_utc = datetime.utcnow()
        rows = await fetch_rows(
            """
            SELECT oc.id, oc.case_number, oc.employee_id, oc.candidate_id,
                   c.country_of_employment
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE oc.welcome_email_status = 'not_sent'
              AND c.joining_date <= CURRENT_DATE
              AND oc.status NOT IN ('REJECTED', 'CANCELLED', 'HOLD_LATE_SUBMISSION')
              AND oc.overall_progress >= 50
            """
        )
        sent = 0
        for row in rows:
            country = row.get("country_of_employment") or "India"
            utc_offset = _COUNTRY_UTC_OFFSET.get(country, -3)
            # Welcome email window: send if current UTC hour matches 08:00 local ± 1 hour
            local_hour = (now_utc.hour - utc_offset) % 24
            if local_hour not in range(7, 10):
                continue
            await execute(
                """
                UPDATE onboarding_cases
                SET welcome_email_status = 'sent',
                    status = CASE WHEN status NOT IN ('COMPLETE', 'completed', 'REJECTED', 'CANCELLED')
                                  THEN 'WELCOME_SENT' ELSE status END,
                    updated_at = NOW()
                WHERE id = $1
                """,
                row["id"],
            )
            await execute(
                """
                INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                  rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                VALUES ($1, $2, $3, 'onboarding', 'welcome_email_sent', 'BR005-WELCOME', 'V6',
                        $4, 'sent', $5, NOW())
                """,
                row["id"], row["candidate_id"], row["employee_id"],
                f"Welcome email sent at 08:00 local ({country}) for {row['case_number']}.",
                settings.AGENT_ID,
            )
            sent += 1
        return {"sent": sent}

    # ── B4: Secondary HIL escalation to Head of HR ──────────────────
    async def secondary_hil_escalation(self) -> dict:
        """Escalate to Head of HR 30 min after initial SLA escalation if still pending."""
        rows = await fetch_rows(
            """
            SELECT id, case_number, employee_id, candidate_id, sla_escalated_at
            FROM onboarding_cases
            WHERE status IN ('pending_hil', 'HOLD_HR_APPROVAL')
              AND sla_escalated_at IS NOT NULL
              AND sla_breach = FALSE
              AND sla_escalated_at <= NOW() - INTERVAL '30 minutes'
            """
        )
        escalated = 0
        for row in rows:
            await execute(
                "UPDATE onboarding_cases SET sla_breach = TRUE, updated_at = NOW() WHERE id = $1",
                row["id"],
            )
            await execute(
                """
                INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
                  rule_ref, rule_version, event_description, outcome, agent_id, created_at)
                VALUES ($1, $2, $3, 'onboarding', 'secondary_escalation_head_hr', 'BR002-SEC', 'V6',
                        $4, 'escalated_head_hr', $5, NOW())
                """,
                row["id"], row["candidate_id"], row["employee_id"],
                f"30-min secondary escalation to Head of HR for {row['case_number']}.",
                settings.AGENT_ID,
            )
            escalated += 1
        return {"escalated": escalated}

    # ── C1: R03 — Document submission rate ──────────────────────────
    async def report_r03_documents(self) -> dict:
        rows = await fetch_rows(
            """
            SELECT
              document_type,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('submitted','validated','approved'))::int AS submitted,
              COUNT(*) FILTER (WHERE status IN ('validated','approved'))::int AS validated,
              COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
              COUNT(*) FILTER (WHERE status = 'correction_required')::int AS correction_required,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE status IN ('submitted','validated','approved'))
                / NULLIF(COUNT(*), 0), 1
              ) AS submission_rate_pct,
              ROUND(AVG(EXTRACT(EPOCH FROM (submitted_at - created_at)) / 3600) FILTER
                (WHERE submitted_at IS NOT NULL), 1
              ) AS avg_hours_to_submit
            FROM documents
            GROUP BY document_type
            ORDER BY total DESC
            """
        )
        totals = await fetch_row(
            """
            SELECT
              COUNT(*)::int AS total_docs,
              COUNT(*) FILTER (WHERE status IN ('submitted','validated','approved'))::int AS total_submitted,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE status IN ('submitted','validated','approved'))
                / NULLIF(COUNT(*), 0), 1
              ) AS overall_submission_rate_pct
            FROM documents
            """
        )
        return {
            "report": "r03-documents",
            "summary": _serialise(dict(totals or {})),
            "by_document_type": _serialise_rows(rows),
        }

    # ── C2: R04 — Post-onboarding completion metrics ─────────────────
    async def report_r04_post_onboarding(self) -> dict:
        rows = await fetch_rows(
            """
            SELECT
              COUNT(*)::int AS total_cases,
              COUNT(*) FILTER (WHERE buddy_assigned)::int AS buddy_assigned,
              COUNT(*) FILTER (WHERE manager_checkin)::int AS manager_checkin,
              COUNT(*) FILTER (WHERE policy_acknowledged)::int AS policy_acknowledged,
              COUNT(*) FILTER (WHERE payroll_confirmed)::int AS payroll_confirmed,
              COUNT(*) FILTER (WHERE pf_confirmed)::int AS pf_confirmed,
              COUNT(*) FILTER (
                WHERE buddy_assigned AND manager_checkin AND policy_acknowledged
                  AND payroll_confirmed AND pf_confirmed
              )::int AS fully_completed
            FROM post_onboarding_items
            """
        )
        summary = dict(rows[0]) if rows else {}
        total = summary.get("total_cases") or 1
        checklist = [
            {"item": "Buddy Assigned",       "completed": summary.get("buddy_assigned", 0),       "rate_pct": round(100 * summary.get("buddy_assigned", 0) / total, 1)},
            {"item": "Manager Check-in",     "completed": summary.get("manager_checkin", 0),      "rate_pct": round(100 * summary.get("manager_checkin", 0) / total, 1)},
            {"item": "Policy Acknowledged",  "completed": summary.get("policy_acknowledged", 0),  "rate_pct": round(100 * summary.get("policy_acknowledged", 0) / total, 1)},
            {"item": "Payroll Confirmed",    "completed": summary.get("payroll_confirmed", 0),     "rate_pct": round(100 * summary.get("payroll_confirmed", 0) / total, 1)},
            {"item": "PF Confirmed",         "completed": summary.get("pf_confirmed", 0),          "rate_pct": round(100 * summary.get("pf_confirmed", 0) / total, 1)},
        ]
        return {
            "report": "r04-post-onboarding",
            "summary": _serialise(summary),
            "checklist_completion": checklist,
        }

    # ── C3: R06 — HIL gate throughput ───────────────────────────────
    async def report_r06_hil(self) -> dict:
        rows = await fetch_rows(
            """
            SELECT
              gate_type,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE decision = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE decision = 'rejected')::int AS rejected,
              COUNT(*) FILTER (WHERE decision = 'pending')::int AS pending,
              ROUND(AVG(EXTRACT(EPOCH FROM (decided_at - created_at)) / 3600)
                FILTER (WHERE decided_at IS NOT NULL), 1
              ) AS avg_resolution_hours,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE decision = 'approved')
                / NULLIF(COUNT(*) FILTER (WHERE decision <> 'pending'), 0), 1
              ) AS approval_rate_pct
            FROM hil_gates
            GROUP BY gate_type
            ORDER BY total DESC
            """
        )
        breach_row = await fetch_row(
            """
            SELECT
              COUNT(*)::int AS total_pending,
              COUNT(*) FILTER (WHERE sla_breach = TRUE)::int AS sla_breached,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE sla_breach = TRUE)
                / NULLIF(COUNT(*), 0), 1
              ) AS breach_rate_pct
            FROM onboarding_cases
            WHERE status IN ('pending_hil', 'HOLD_HR_APPROVAL')
            """
        )
        return {
            "report": "r06-hil-gates",
            "by_gate_type": _serialise_rows(rows),
            "sla_overview": _serialise(dict(breach_row or {})),
        }

    # ── C4: R01 enhanced with SLA compliance rate ───────────────────
    async def report_r01_pipeline(self) -> dict:
        mvp = MvpReadService()
        analytics = mvp.analytics_from_cases(await mvp.cases())
        kpis = await self.kpis()
        sla_row = await fetch_row(
            """
            SELECT
              COUNT(*)::int AS total_hil_cases,
              COUNT(*) FILTER (WHERE sla_breach = FALSE AND status IN ('pending_hil','HOLD_HR_APPROVAL'))::int AS within_sla,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE sla_breach = FALSE AND status IN ('pending_hil','HOLD_HR_APPROVAL'))
                / NULLIF(COUNT(*) FILTER (WHERE status IN ('pending_hil','HOLD_HR_APPROVAL')), 0), 1
              ) AS sla_compliance_rate_pct
            FROM onboarding_cases
            """
        )
        risk_timeline = await fetch_rows(
            """
            SELECT
              DATE_TRUNC('day', c.joining_date) AS joining_day,
              ROUND(AVG(
                CASE oc.status
                  WHEN 'COMPLETE' THEN 5 WHEN 'WELCOME_SENT' THEN 10 WHEN 'PAYROLL_SETUP' THEN 20
                  WHEN 'PROVISIONING' THEN 30 WHEN 'AWAITING_SUBMISSION' THEN 40
                  WHEN 'HOLD_HR_APPROVAL' THEN 55 WHEN 'HOLD_HR_SIGNOFF' THEN 60
                  WHEN 'HOLD_LATE_SUBMISSION' THEN 75 WHEN 'REJECTED' THEN 90
                  WHEN 'at_risk' THEN 78 WHEN 'blocked' THEN 92 ELSE 30
                END
              ))::int AS avg_risk_score
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE c.joining_date IS NOT NULL
            GROUP BY DATE_TRUNC('day', c.joining_date)
            ORDER BY joining_day ASC
            LIMIT 30
            """
        )
        return {
            "report": "r01-pipeline",
            "kpis": kpis,
            "by_phase": analytics["byPhase"],
            "by_status": analytics["byStatus"],
            "sla_compliance": _serialise(dict(sla_row or {})),
            "risk_timeline": _serialise_rows(risk_timeline),
        }

    # ── C5: Cases stats — all 11 BRD states ─────────────────────────
    async def cases_stats(self) -> dict:
        rows = await fetch_rows(
            """
            SELECT status, COUNT(*)::int AS count
            FROM onboarding_cases
            GROUP BY status
            ORDER BY count DESC
            """
        )
        phase_rows = await fetch_rows(
            """
            SELECT phase, COUNT(*)::int AS count
            FROM onboarding_cases
            GROUP BY phase
            ORDER BY count DESC
            """
        )
        total_row = await fetch_row("SELECT COUNT(*)::int AS total FROM onboarding_cases")
        return {
            "total": (total_row or {}).get("total", 0),
            "by_status": {row["status"]: row["count"] for row in rows},
            "by_phase": {row["phase"]: row["count"] for row in phase_rows},
        }

    # ── C6: CSV export ───────────────────────────────────────────────
    async def export_report_csv(self, report_id: str) -> StreamingResponse:
        if report_id in ("r01-pipeline", "r01"):
            data = await self.report_r01_pipeline()
            rows_data = [{"metric": k, "value": v} for k, v in (data.get("kpis") or {}).items()]
            filename = "r01_pipeline_kpis.csv"
        elif report_id in ("r03-documents", "r03"):
            data = await self.report_r03_documents()
            rows_data = data.get("by_document_type") or []
            filename = "r03_document_submission.csv"
        elif report_id in ("r04-post-onboarding", "r04"):
            data = await self.report_r04_post_onboarding()
            rows_data = data.get("checklist_completion") or []
            filename = "r04_post_onboarding.csv"
        elif report_id in ("r06-hil-gates", "r06"):
            data = await self.report_r06_hil()
            rows_data = data.get("by_gate_type") or []
            filename = "r06_hil_gates.csv"
        else:
            raise HTTPException(status_code=404, detail=f"Unknown report for CSV export: {report_id}")

        if not rows_data:
            rows_data = [{"info": "No data available"}]

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(rows_data[0].keys()))
        writer.writeheader()
        writer.writerows(rows_data)
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    async def _check_and_trigger_hil(self, case_id: int) -> None:
        """Transition case to pending_hil automatically when all documents are validated."""
        counts = await fetch_row(
            """
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('validated', 'approved', 'verified'))::int AS validated
            FROM documents
            WHERE case_id = $1
            """,
            case_id,
        )
        if not counts or counts["total"] == 0 or counts["total"] != counts["validated"]:
            return
        case = await fetch_row(
            "SELECT status, case_number, employee_id, candidate_id FROM onboarding_cases WHERE id = $1",
            case_id,
        )
        if not case or case["status"] == "pending_hil":
            return
        await execute(
            "UPDATE onboarding_cases SET status = 'pending_hil', updated_at = NOW() WHERE id = $1",
            case_id,
        )
        await execute(
            """
            INSERT INTO audit_logs (case_id, candidate_id, employee_id, phase, event_type,
              rule_ref, rule_version, event_description, outcome, agent_id, created_at)
            VALUES ($1, $2, $3, 'onboarding', 'hil_trigger', 'BR002-STEP5', 'V6', $4, 'pending_hil', $5, NOW())
            """,
            case_id, case["candidate_id"], case["employee_id"],
            f"All documents validated for case {case['case_number']}. Case transitioned to pending_hil.",
            settings.AGENT_ID,
        )

    async def _get_active_template_version(self, template_name: str) -> str | None:
        row = await fetch_row(
            "SELECT version FROM email_templates WHERE template_name = $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1",
            template_name,
        )
        return (row or {}).get("version")

    async def _seed_initial_consents(self, case, candidate) -> None:
        try:
            for category in ["data_processing", "background_check", "communication", "payroll"]:
                await execute(
                    """
                    INSERT INTO consents (case_id, candidate_id, processing_category, created_at)
                    VALUES ($1, $2, $3, NOW())
                    """,
                    case["id"],
                    candidate["id"],
                    category,
                )
        except Exception:
            pass  # Table not yet present; apply DDL to enable consent tracking

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
        candidate_values = dict(candidate)
        joining_date = candidate_values.get("joining_date") or date.today()
        if isinstance(joining_date, datetime):
            joining_date = joining_date.date()
        fu_cols = await table_columns("follow_ups")
        has_template_version = "template_version" in fu_cols
        template_versions: dict[str, str | None] = {}
        if has_template_version:
            for ft in ["t_minus_7", "t_minus_3", "t_plus_0"]:
                template_versions[ft] = await self._get_active_template_version(ft)
        for follow_type, days_before in [("t_minus_7", 7), ("t_minus_3", 3), ("t_plus_0", 0)]:
            scheduled_at = datetime.combine(joining_date - timedelta(days=days_before), datetime.min.time()).replace(hour=9)
            if has_template_version:
                await execute(
                    """
                    INSERT INTO follow_ups (case_id, follow_up_type, scheduled_at, channel, response_status, notes, template_version, created_at)
                    VALUES ($1, $2, $3, 'email', 'pending', 'Auto-created by candidate trigger', $4, NOW())
                    """,
                    case["id"],
                    follow_type,
                    scheduled_at,
                    template_versions.get(follow_type),
                )
            else:
                await execute(
                    """
                    INSERT INTO follow_ups (case_id, follow_up_type, scheduled_at, channel, response_status, notes, created_at)
                    VALUES ($1, $2, $3, 'email', 'pending', 'Auto-created by candidate trigger', NOW())
                    """,
                    case["id"],
                    follow_type,
                    scheduled_at,
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
        await self._seed_initial_consents(case, candidate)

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
        if is_completed or status in ("completed", "COMPLETE"):
            return "completed"
        if hr_decision == "pending" or status in ("pending_hil", "HOLD_HR_APPROVAL", "HOLD_HR_SIGNOFF"):
            return "hil"
        if hr_decision == "rejected" or status in ("blocked", "REJECTED", "CANCELLED"):
            return "blocked"
        if sla_breach or status in ("at_risk", "HOLD_LATE_SUBMISSION"):
            return "at-risk"
        return {
            "in_progress": "in-progress",
            "active": "in-progress",
            "CREATED": "in-progress",
            "AWAITING_SUBMISSION": "in-progress",
            "PROVISIONING": "in-progress",
            "PAYROLL_SETUP": "in-progress",
            "WELCOME_SENT": "in-progress",
        }.get(status or "", status or "in-progress")

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

    @staticmethod
    def _hr_owner(department: str | None, office_location: str | None) -> str:
        location = (office_location or "").lower()
        department_value = (department or "").lower()
        if any(city in location for city in ["hyderabad", "bangalore", "bengaluru"]):
            return "Priya Nair - HR Coordinator"
        if any(city in location for city in ["mumbai", "pune"]):
            return "Rohan Mehta - HR Coordinator"
        if any(team in department_value for team in ["engineering", "it", "security"]):
            return "Ananya Rao - HR Coordinator"
        if any(team in department_value for team in ["finance", "legal", "compliance"]):
            return "Meera Iyer - HR Coordinator"
        return "HR Coordinator"

    async def _post_onboarding_percent(self, case_id) -> int:
        row = await fetch_row("SELECT * FROM post_onboarding_items WHERE case_id = $1 LIMIT 1", case_id)
        if not row:
            return 0
        values = dict(row)
        bool_values = [value for key, value in values.items() if isinstance(value, bool) and key not in {"is_deleted"}]
        if not bool_values:
            return 0
        return round(100 * sum(1 for value in bool_values if value) / len(bool_values))


def _business_hours_elapsed(start_utc: datetime, end_utc: datetime) -> float:
    """Return business hours (Mon–Fri 09:00–18:00 IST = UTC+5:30) elapsed between two UTC datetimes."""
    ist_offset = timedelta(hours=5, minutes=30)
    start_naive = start_utc.replace(tzinfo=None) if start_utc.tzinfo else start_utc
    end_naive = end_utc.replace(tzinfo=None) if end_utc.tzinfo else end_utc
    start_ist = start_naive + ist_offset
    end_ist = end_naive + ist_offset
    BH_START, BH_END = 9, 18
    total_secs = 0.0
    current_day = start_ist.date()
    end_day = end_ist.date()
    while current_day <= end_day:
        if current_day.weekday() < 5:
            day_bh_start = datetime.combine(current_day, datetime.min.time()).replace(hour=BH_START)
            day_bh_end = datetime.combine(current_day, datetime.min.time()).replace(hour=BH_END)
            window_start = max(start_ist.replace(tzinfo=None) if start_ist.tzinfo else start_ist, day_bh_start)
            window_end = min(end_ist.replace(tzinfo=None) if end_ist.tzinfo else end_ist, day_bh_end)
            if window_end > window_start:
                total_secs += (window_end - window_start).total_seconds()
        current_day += timedelta(days=1)
    return total_secs / 3600


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
        WHERE table_schema = $1 AND table_name = $2
        """,
        APP_SCHEMA,
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
