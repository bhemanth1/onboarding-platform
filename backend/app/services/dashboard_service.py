"""
Dashboard Service - View-model assembly for the desktop frontend.
"""
from datetime import datetime


class DashboardService:
    """Build frontend-ready data from the persistence layer."""

    COLORS = [
        "#5929d0",
        "#CF008B",
        "#0E2E89",
        "#16A34A",
        "#E4902E",
        "#22D3EE",
        "#7C3AED",
        "#DC2626",
    ]
    PHASE_LABELS = {"pre": "Pre-Onboarding", "onb": "Onboarding", "post": "Post-Onboarding", "completed": "Completed"}

    def __init__(self, db):
        self.db = db

    def bootstrap(self) -> dict:
        """Return all state needed by the static desktop shell."""
        return {
            "employees": self.desktop_cases(),
            "audit": self.audit_events(),
            "exceptions": self.exceptions(),
            "metrics": self.metrics(),
        }

    def desktop_cases(self) -> list[dict]:
        cursor = self.db.cursor()
        cursor.execute(
            """
            SELECT oc.*, e.role, e.department, e.joining_date, e.it_status,
                   e.documents_status, e.first_name, e.last_name
            FROM onboarding_cases oc
            JOIN employees e ON e.id = oc.employee_id
            ORDER BY e.joining_date ASC
            """
        )
        cases = []
        for index, row in enumerate(cursor.fetchall()):
            data = dict(row)
            first = data["first_name"]
            last = data["last_name"]
            initials = f"{first[:1]}{last[:1]}".upper()
            cases.append(
                {
                    "id": data["employee_id"],
                    "caseId": data["id"],
                    "name": data["employee_name"],
                    "ini": initials,
                    "col": self.COLORS[index % len(self.COLORS)],
                    "role": data["role"],
                    "dept": data["department"],
                    "phase": self.PHASE_LABELS.get(data["phase"], data["phase"]),
                    "phaseKey": data["phase"],
                    "st": data["status"],
                    "join": data["joining_date"][:10],
                    "prog": data["progress_percentage"],
                    "it": data["it_status"] or data["identity_doc_status"],
                    "docs": data["documents_status"] or data["address_proof_status"],
                    "assignedTo": data["assigned_to"],
                }
            )
        return cases

    def audit_events(self, limit: int = 20) -> list[dict]:
        cursor = self.db.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
        events = []
        for row in cursor.fetchall():
            data = dict(row)
            ts = data["timestamp"]
            try:
                ts = datetime.fromisoformat(ts).strftime("%H:%M")
            except ValueError:
                ts = ts[:5]
            events.append(
                {
                    "ts": ts,
                    "case": data["case_id"],
                    "emp": data["employee_name"],
                    "phase": "",
                    "ev": data["action"],
                    "rule": data["rule_triggered"] or "",
                    "out": data["description"] or data["outcome"],
                    "dot": "g" if data["outcome"] == "success" else "o" if data["outcome"] == "warning" else "pk",
                }
            )
        return events

    def metrics(self) -> dict:
        cases = self.desktop_cases()
        return {
            "active": len(cases),
            "inProgress": len([c for c in cases if c["st"] == "in-progress"]),
            "pendingHil": len([c for c in cases if c["st"] == "hil"]),
            "completed": len([c for c in cases if c["st"] == "completed"]),
            "atRisk": len([c for c in cases if c["st"] == "at-risk"]),
            "blocked": len([c for c in cases if c["st"] == "blocked"]),
        }

    def exceptions(self) -> list[dict]:
        rows = self.db.execute(
            """
            SELECT hg.id, hg.gate_name, hg.status, hg.description, oc.employee_name
            FROM hil_gates hg
            JOIN onboarding_cases oc ON oc.id = hg.case_id
            WHERE hg.status IN ('pending', 'blocked', 'rejected')
            ORDER BY hg.created_at DESC
            """
        ).fetchall()
        return [
            {
                "tag": "HIL" if row["status"] == "pending" else "BLOCKER",
                "tc": "hil" if row["status"] == "pending" else "blocker",
                "emp": row["employee_name"],
                "type": row["gate_name"],
                "desc": row["description"],
                "hil": row["status"] == "pending",
            }
            for row in rows
        ]
