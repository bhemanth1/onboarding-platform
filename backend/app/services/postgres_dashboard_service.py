"""
PostgreSQL Dashboard Service - maps the AegisAI schema to the desktop UI.
"""
from datetime import date, datetime

from ..database.postgres import fetch_rows
from .dashboard_service import DashboardService


class PostgresDashboardService:
    """Read AegisAI PostgreSQL rows and build the MVP frontend view model."""

    PHASE_LABELS = {
        "pre_onboarding": "Pre-Onboarding",
        "onboarding": "Onboarding",
        "post_onboarding": "Post-Onboarding",
        "completed": "Completed",
    }
    STATUS_LABELS = {
        "pending_hil": "hil",
        "in_progress": "in-progress",
        "at_risk": "at-risk",
        "blocked": "blocked",
        "completed": "completed",
        "active": "in-progress",
        "withdrawn": "blocked",
    }

    async def bootstrap(self) -> dict:
        employees = await self.desktop_cases()
        audit = await self.audit_events()
        return {
            "employees": employees,
            "audit": audit,
            "exceptions": DashboardService(None).exceptions(),
            "metrics": self.metrics_from_cases(employees),
            "source": "postgresql",
        }

    async def desktop_cases(self) -> list[dict]:
        rows = await fetch_rows(
            """
            SELECT
              oc.id AS case_uuid,
              oc.case_number,
              oc.employee_id,
              oc.phase,
              oc.status,
              oc.is_completed,
              oc.overall_progress,
              oc.pre_onboarding_progress,
              oc.onboarding_progress,
              oc.post_onboarding_progress,
              oc.it_status,
              oc.docs_status,
              oc.sla_breach,
              bg.decision AS bg_verification_decision,
              c.first_name,
              c.last_name,
              c.role,
              c.department,
              c.joining_date,
              COALESCE(pre.total, 0) AS pre_total,
              COALESCE(pre.completed, 0) AS pre_completed,
              COALESCE(doc.total, 0) AS doc_total,
              COALESCE(doc.completed, 0) AS doc_completed,
              COALESCE(prov.total, 0) AS prov_total,
              COALESCE(prov.completed, 0) AS prov_completed
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
              FROM pre_onboarding_tasks
              WHERE case_id = oc.id
            ) pre ON TRUE
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('validated', 'approved', 'verified'))::int AS completed
              FROM documents
              WHERE case_id = oc.id
            ) doc ON TRUE
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
              FROM provisioning_items
              WHERE case_id = oc.id
            ) prov ON TRUE
            LEFT JOIN LATERAL (
              SELECT decision
              FROM hil_gates
              WHERE case_id = oc.id AND gate_type = 'doc_bg_verification'
              ORDER BY created_at DESC
              LIMIT 1
            ) bg ON TRUE
            ORDER BY c.joining_date ASC, oc.created_at DESC
            """
        )

        cases = []
        for index, row in enumerate(rows):
            first = row["first_name"] or ""
            last = row["last_name"] or ""
            employee_id = row["employee_id"] or row["case_number"]
            pre_progress = self._percent(row["pre_completed"], row["pre_total"], row["pre_onboarding_progress"])
            doc_progress = self._percent(row["doc_completed"], row["doc_total"], None)
            prov_progress = self._percent(row["prov_completed"], row["prov_total"], None)
            onboarding_parts = [value for value in [doc_progress, prov_progress] if value is not None]
            onboarding_progress = round(sum(onboarding_parts) / len(onboarding_parts)) if onboarding_parts else (row["onboarding_progress"] or 0)
            progress = round((pre_progress + onboarding_progress + (row["post_onboarding_progress"] or 0)) / 3)
            status = "completed" if row["is_completed"] else ("at-risk" if row["sla_breach"] else self.STATUS_LABELS.get(row["status"], row["status"]))
            bg_decision = row["bg_verification_decision"]
            if status != "completed" and bg_decision == "pending":
                status = "hil"
            elif status != "completed" and bg_decision == "rejected":
                status = "blocked"
            docs_status = self._label(row["docs_status"])
            if bg_decision:
                docs_status = f"HR {self._label(bg_decision)}"
            cases.append(
                {
                    "id": employee_id,
                    "caseId": row["case_number"],
                    "caseUuid": str(row["case_uuid"]),
                    "name": f"{first} {last}".strip(),
                    "ini": f"{first[:1]}{last[:1]}".upper() or "AE",
                    "col": DashboardService.COLORS[index % len(DashboardService.COLORS)],
                    "role": row["role"],
                    "dept": row["department"],
                    "phase": self.PHASE_LABELS.get(row["phase"], row["phase"]),
                    "phaseKey": row["phase"],
                    "st": status,
                    "rawStatus": row["status"],
                    "isCompleted": bool(row["is_completed"]),
                    "join": self._format_date(row["joining_date"]),
                    "prog": progress,
                    "it": self._label(row["it_status"]),
                    "docs": docs_status,
                    "backgroundVerification": bg_decision,
                    "assignedTo": "AEGIS Agent",
                }
            )
        return cases

    async def audit_events(self, limit: int = 20) -> list[dict]:
        rows = await fetch_rows(
            """
            SELECT
              al.created_at,
              al.employee_id,
              al.phase,
              al.event_type,
              al.rule_ref,
              al.event_description,
              al.outcome,
              oc.case_number,
              c.first_name,
              c.last_name
            FROM audit_logs al
            LEFT JOIN onboarding_cases oc ON oc.id = al.case_id
            LEFT JOIN candidates c ON c.id = al.candidate_id
            ORDER BY al.created_at DESC
            LIMIT $1
            """,
            limit,
        )

        events = []
        for row in rows:
            name = f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or row["employee_id"] or "System"
            event_type = row["event_type"] or "activity"
            events.append(
                {
                    "ts": self._format_time(row["created_at"]),
                    "case": row["case_number"] or "",
                    "emp": name,
                    "phase": self.PHASE_LABELS.get(row["phase"], row["phase"] or ""),
                    "ev": row["event_description"],
                    "rule": row["rule_ref"] or event_type.upper(),
                    "out": row["outcome"] or self._label(event_type),
                    "dot": self._dot(event_type, row["outcome"]),
                }
            )
        return events

    def metrics_from_cases(self, cases: list[dict]) -> dict:
        return {
            "active": len(cases),
            "inProgress": len([c for c in cases if c["st"] == "in-progress"]),
            "pendingHil": len([c for c in cases if c["st"] == "hil"]),
            "completed": len([c for c in cases if c["st"] == "completed"]),
            "atRisk": len([c for c in cases if c["st"] == "at-risk"]),
            "blocked": len([c for c in cases if c["st"] == "blocked"]),
        }

    @staticmethod
    def _label(value: str | None) -> str:
        return (value or "not_started").replace("_", " ").title()

    @staticmethod
    def _format_date(value) -> str:
        if isinstance(value, (datetime, date)):
            return value.strftime("%Y-%m-%d")
        return str(value)[:10]

    @staticmethod
    def _format_time(value) -> str:
        if isinstance(value, datetime):
            return value.strftime("%H:%M")
        return str(value)[11:16] if value else "--:--"

    @staticmethod
    def _percent(completed: int, total: int, fallback: int | None) -> int | None:
        if total:
            return round(100 * completed / total)
        return fallback

    @staticmethod
    def _dot(event_type: str, outcome: str | None) -> str:
        if event_type in {"alert", "provisioning"} or outcome in {"blocked", "failed"}:
            return "o"
        if event_type == "hil_decision":
            return "pk"
        return "g"
