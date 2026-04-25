"""
MVP Read Service - GET-only view models for the React frontend.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime

from ..database.postgres import fetch_row, fetch_rows, postgres_enabled
from .dashboard_service import DashboardService
from .postgres_dashboard_service import PostgresDashboardService


class MvpReadService:
    """Build read-only dashboard, analytics, workflow, and scenario data."""

    async def dashboard(self) -> dict:
        cases = await self.cases()
        audit = await self.audit(limit=30)
        analytics = self.analytics_from_cases(cases)
        if postgres_enabled():
            analytics["metrics"] = await self.raw_metrics(cases)
        return {
            "source": "postgresql" if postgres_enabled() else "sqlite",
            "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "metrics": analytics["metrics"],
            "cases": cases,
            "audit": audit,
            "analytics": analytics,
            "hil_gates": await self.hil_gates(),
            "workflow": self.workflow_summary(),
        }

    async def raw_metrics(self, cases: list[dict] | None = None) -> dict:
        if not postgres_enabled():
            return self.analytics_from_cases(cases or [])["metrics"]
        row = await fetch_row(
            """
            SELECT
              COUNT(*) FILTER (WHERE status NOT IN ('completed', 'withdrawn'))::int AS active,
              COUNT(*) FILTER (WHERE status IN ('in_progress', 'active'))::int AS in_progress,
              COUNT(*) FILTER (WHERE status = 'pending_hil')::int AS pending_hil,
              COUNT(*) FILTER (WHERE COALESCE(is_completed, FALSE) = TRUE OR status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'at_risk')::int AS at_risk,
              COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked,
              COUNT(*) FILTER (WHERE COALESCE(sla_breach, FALSE) = TRUE)::int AS sla_breaches,
              COALESCE(ROUND(AVG(overall_progress)), 0)::int AS avg_progress
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
        risks = [case["riskScore"] for case in cases or [] if "riskScore" in case]
        return {
            "active": row["active"],
            "inProgress": row["in_progress"],
            "pendingHil": row["pending_hil"],
            "completed": row["completed"],
            "atRisk": row["at_risk"],
            "blocked": row["blocked"],
            "slaBreaches": row["sla_breaches"],
            "openExceptions": (exceptions or {}).get("open_exceptions", 0),
            "avgProgress": row["avg_progress"],
            "avgRisk": round(sum(risks) / len(risks)) if risks else 0,
        }

    async def cases(self) -> list[dict]:
        if not postgres_enabled():
            return DashboardService(None).bootstrap()["employees"]

        cases = await PostgresDashboardService().desktop_cases()
        for item in cases:
            item["scenario"] = self._scenario(item)
            item["slaLabel"] = self._sla_label(item)
            item["riskScore"] = self._risk_score(item)
        return cases

    async def case_detail(self, case_ref: str) -> dict | None:
        cases = await self.cases()
        case = next(
            (
                item
                for item in cases
                if case_ref in {item.get("id"), item.get("caseId"), item.get("caseUuid")}
            ),
            None,
        )
        if not case or not postgres_enabled():
            return case

        detail = await fetch_row(
            """
            SELECT
              oc.case_number, oc.employee_id, oc.phase, oc.status, oc.it_status,
              oc.docs_status, oc.payroll_status, oc.pf_status, oc.sla_breach,
              oc.pre_onboarding_progress, oc.onboarding_progress,
              oc.post_onboarding_progress, oc.overall_progress,
              c.first_name, c.last_name, c.personal_email, c.phone, c.role,
              c.department, c.manager_name, c.joining_date, c.office_location,
              c.nationality
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE oc.case_number = $1 OR oc.employee_id = $1 OR oc.id::text = $1
            LIMIT 1
            """,
            case_ref,
        )
        if detail:
            case["detail"] = dict(detail)
        case["timeline"] = await self.audit(case_ref=case_ref, limit=50)
        case["hil_gates"] = [gate for gate in await self.hil_gates() if gate["case_number"] == case["caseId"]]
        return case

    async def audit(self, limit: int = 50, case_ref: str | None = None) -> list[dict]:
        if not postgres_enabled():
            return DashboardService(None).audit_events(limit)

        where = ""
        args: list = [limit]
        if case_ref:
            where = "WHERE oc.case_number = $2 OR oc.employee_id = $2 OR oc.id::text = $2"
            args.append(case_ref)
        rows = await fetch_rows(
            f"""
            SELECT
              al.created_at, al.employee_id, al.phase, al.event_type, al.rule_ref,
              al.event_description, al.outcome, oc.case_number, c.first_name, c.last_name
            FROM audit_logs al
            LEFT JOIN onboarding_cases oc ON oc.id = al.case_id
            LEFT JOIN candidates c ON c.id = al.candidate_id
            {where}
            ORDER BY al.created_at DESC
            LIMIT $1
            """,
            *args,
        )
        return [
            {
                "ts": self._time(row["created_at"]),
                "case": row["case_number"] or "",
                "emp": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or row["employee_id"] or "System",
                "phase": (row["phase"] or "").replace("_", " ").title(),
                "ev": row["event_description"],
                "rule": row["rule_ref"] or (row["event_type"] or "activity").upper(),
                "out": row["outcome"] or "",
                "dot": self._dot(row["event_type"], row["outcome"]),
            }
            for row in rows
        ]

    async def hil_gates(self) -> list[dict]:
        if not postgres_enabled():
            return []
        rows = await fetch_rows(
            """
            SELECT
              hg.id, hg.gate_type, hg.decision, hg.email_sent_to, hg.email_sent_at,
              hg.decided_at, hg.flag_description, hg.token_expires_at,
              oc.case_number, oc.employee_id, c.first_name, c.last_name
            FROM hil_gates hg
            JOIN onboarding_cases oc ON oc.id = hg.case_id
            JOIN candidates c ON c.id = oc.candidate_id
            ORDER BY hg.created_at DESC
            LIMIT 100
            """
        )
        return [
            {
                "gate_id": str(row["id"]),
                "case_number": row["case_number"],
                "employee_id": row["employee_id"],
                "candidate_name": f"{row['first_name']} {row['last_name']}",
                "gate_type": (row["gate_type"] or "").replace("_", " ").title(),
                "decision": row["decision"],
                "email_sent_to": row["email_sent_to"],
                "email_sent_at": self._datetime(row["email_sent_at"]),
                "decided_at": self._datetime(row["decided_at"]),
                "token_expires_at": self._datetime(row["token_expires_at"]),
                "flag_description": row["flag_description"],
            }
            for row in rows
        ]

    def analytics_from_cases(self, cases: list[dict]) -> dict:
        status = Counter(case["st"] for case in cases)
        phase = Counter(case["phase"] for case in cases)
        dept = Counter(case["dept"] for case in cases)
        docs = Counter(case.get("backgroundVerification") or case.get("docs") for case in cases)
        risks = [case["riskScore"] for case in cases] if cases and "riskScore" in cases[0] else []
        return {
            "metrics": {
                "active": len(cases),
                "inProgress": status["in-progress"],
                "pendingHil": status["hil"],
                "completed": status["completed"],
                "atRisk": status["at-risk"],
                "blocked": status["blocked"],
                "avgProgress": round(sum(case["prog"] for case in cases) / len(cases)) if cases else 0,
                "avgRisk": round(sum(risks) / len(risks)) if risks else 0,
            },
            "byStatus": dict(status),
            "byPhase": dict(phase),
            "byDepartment": dict(dept),
            "byBackgroundVerification": dict(docs),
            "topRisks": sorted(cases, key=lambda item: item.get("riskScore", 0), reverse=True)[:5],
        }

    @staticmethod
    def workflow_summary() -> dict:
        return {
            "newJoiner": [
                "Recruitment trigger",
                "7/3/0 day reminders",
                "Basic info submission check",
                "HR exception review",
                "IT/Admin assignment",
                "Country/tax forms",
                "Validation retry",
                "Payroll handoff",
                "Welcome and completion",
            ],
            "hrCoordinator": [
                "Dashboard overview",
                "IT/Admin task monitoring",
                "Reminder response tracking",
                "Basic information exception review",
                "Document validation monitoring",
                "Bank/payroll status",
                "Reports and audit logs",
            ],
        }

    @staticmethod
    def _scenario(case: dict) -> str:
        if case["st"] == "hil":
            return "Awaiting HR approval"
        if case["st"] == "blocked":
            return "Blocked exception"
        if case["st"] == "at-risk":
            return "SLA at risk"
        if case["st"] == "completed":
            return "Completed onboarding"
        if case["phase"] == "Pre-Onboarding":
            return "Pre-boarding in progress"
        if case["phase"] == "Post-Onboarding":
            return "Post-boarding checklist"
        return "Normal onboarding"

    @staticmethod
    def _sla_label(case: dict) -> str:
        if case["st"] in {"blocked", "at-risk"}:
            return "SLA Watch"
        if case["prog"] >= 90:
            return "Near Closure"
        return "On Track"

    @staticmethod
    def _risk_score(case: dict) -> int:
        base = {"completed": 5, "in-progress": 25, "hil": 55, "at-risk": 78, "blocked": 92}.get(case["st"], 30)
        return min(99, base + max(0, 60 - int(case["prog"])) // 6)

    @staticmethod
    def _time(value) -> str:
        if isinstance(value, datetime):
            return value.strftime("%H:%M")
        return str(value)[11:16] if value else "--:--"

    @staticmethod
    def _datetime(value) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value) if value else None

    @staticmethod
    def _dot(event_type: str | None, outcome: str | None) -> str:
        if event_type in {"alert", "provisioning"} or outcome in {"blocked", "failed", "rejected"}:
            return "o"
        if event_type == "hil_decision":
            return "pk"
        return "g"
