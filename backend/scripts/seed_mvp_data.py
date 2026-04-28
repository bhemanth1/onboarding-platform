"""
Seed scenario-rich MVP data into the configured PostgreSQL database.

Run:
    .venv\\Scripts\\python.exe scripts\\seed_mvp_data.py
"""
from __future__ import annotations

import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database.postgres import execute, fetch_row


NOW = datetime.now(timezone.utc)


CASES = [
    ("OB-MVP-1001", "EMP-MVP-1001", "Nisha", "Rao", "nisha.rao@mvp.aegis.local", "Product Manager", "Product", "pre_onboarding", "active", 35, "in_progress", "not_started", False, None),
    ("OB-MVP-1002", "EMP-MVP-1002", "Daniel", "Kim", "daniel.kim@mvp.aegis.local", "Backend Engineer", "Engineering", "onboarding", "pending_hil", 58, "completed", "validated", False, "pending"),
    ("OB-MVP-1003", "EMP-MVP-1003", "Maya", "Iyer", "maya.iyer@mvp.aegis.local", "UX Researcher", "Design", "onboarding", "in_progress", 72, "completed", "validated", False, "approved"),
    ("OB-MVP-1004", "EMP-MVP-1004", "Omar", "Hassan", "omar.hassan@mvp.aegis.local", "Finance Analyst", "Finance", "onboarding", "blocked", 48, "blocked", "rejected", False, "rejected"),
    ("OB-MVP-1005", "EMP-MVP-1005", "Elena", "Petrova", "elena.petrova@mvp.aegis.local", "Compliance Lead", "Legal", "post_onboarding", "at_risk", 82, "completed", "validated", True, "approved"),
    ("OB-MVP-1006", "EMP-MVP-1006", "Karthik", "Menon", "karthik.menon@mvp.aegis.local", "Data Analyst", "Analytics", "completed", "completed", 100, "completed", "validated", False, "approved"),
    ("OB-MVP-1007", "EMP-MVP-1007", "Sofia", "Garcia", "sofia.garcia@mvp.aegis.local", "HR Specialist", "HR", "pre_onboarding", "at_risk", 18, "not_started", "not_submitted", True, None),
    ("OB-MVP-1008", "EMP-MVP-1008", "Lucas", "Meyer", "lucas.meyer@mvp.aegis.local", "DevOps Engineer", "Engineering", "onboarding", "in_progress", 64, "failed_retrying", "correction_required", False, "approved"),
    ("OB-MVP-1009", "EMP-MVP-1009", "Amina", "Yusuf", "amina.yusuf@mvp.aegis.local", "Payroll Coordinator", "Finance", "onboarding", "blocked", 69, "completed", "validated", False, "approved"),
    ("OB-MVP-1010", "EMP-MVP-1010", "Wei", "Zhang", "wei.zhang@mvp.aegis.local", "IT Support", "IT", "post_onboarding", "in_progress", 91, "completed", "validated", False, "approved"),
    ("OB-MVP-1011", "EMP-MVP-1011", "Fatima", "Khan", "fatima.khan@mvp.aegis.local", "Security Engineer", "Security", "onboarding", "pending_hil", 52, "completed", "validated", False, "pending"),
    ("OB-MVP-1012", "EMP-MVP-1012", "Noah", "Wilson", "noah.wilson@mvp.aegis.local", "Sales Operations", "Revenue", "pre_onboarding", "active", 24, "in_queue", "partial", False, None),
]


async def seed():
    await cleanup_existing()
    for index, item in enumerate(CASES, start=1):
        (
            case_number,
            employee_id,
            first_name,
            last_name,
            email,
            role,
            department,
            phase,
            status,
            progress,
            it_status,
            docs_status,
            sla_breach,
            hil_decision,
        ) = item
        candidate = await fetch_row(
            """
            INSERT INTO candidates (
              first_name, last_name, personal_email, phone, role, department,
              manager_name, joining_date, employee_type, office_location, nationality,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, '+91-90000-00000', $4, $5, 'Nandita Mehta',
                    $6, 'new_hire', 'Bengaluru HQ', 'Indian', NOW(), NOW())
            ON CONFLICT (personal_email)
            DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              role = EXCLUDED.role,
              department = EXCLUDED.department,
              joining_date = EXCLUDED.joining_date,
              updated_at = NOW()
            RETURNING id
            """,
            first_name,
            last_name,
            email,
            role,
            department,
            date.today() + timedelta(days=index - 5),
        )

        case = await fetch_row(
            """
            INSERT INTO onboarding_cases (
              case_number, candidate_id, employee_id, phase, status,
              pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
              overall_progress, it_status, docs_status, payroll_status, pf_status,
              is_completed, completed_at, sla_breach, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15, $16, NOW(), NOW())
            ON CONFLICT (case_number)
            DO UPDATE SET
              employee_id = EXCLUDED.employee_id,
              phase = EXCLUDED.phase,
              status = EXCLUDED.status,
              pre_onboarding_progress = EXCLUDED.pre_onboarding_progress,
              onboarding_progress = EXCLUDED.onboarding_progress,
              post_onboarding_progress = EXCLUDED.post_onboarding_progress,
              overall_progress = EXCLUDED.overall_progress,
              it_status = EXCLUDED.it_status,
              docs_status = EXCLUDED.docs_status,
              payroll_status = EXCLUDED.payroll_status,
              pf_status = EXCLUDED.pf_status,
              is_completed = EXCLUDED.is_completed,
              completed_at = EXCLUDED.completed_at,
              sla_breach = EXCLUDED.sla_breach,
              updated_at = NOW()
            RETURNING id
            """,
            case_number,
            candidate["id"],
            employee_id,
            phase,
            status,
            min(progress, 100) if phase != "pre_onboarding" else progress,
            progress if phase == "onboarding" else (100 if phase in {"post_onboarding", "completed"} else 0),
            progress if phase == "post_onboarding" else (100 if phase == "completed" else 0),
            progress,
            it_status,
            docs_status,
            "failed" if case_number == "OB-MVP-1009" else ("completed" if progress > 70 else "not_started"),
            "overdue" if case_number == "OB-MVP-1005" else ("completed" if progress == 100 else "not_started"),
            status == "completed",
            NOW if status == "completed" else None,
            sla_breach,
        )

        await _seed_tasks(case["id"], index, status)
        await _seed_followups(case["id"], index)
        await _seed_audit(case["id"], candidate["id"], employee_id, phase, first_name, last_name, case_number, status)
        if hil_decision:
            await _seed_hil(case["id"], candidate["id"], employee_id, phase, first_name, last_name, case_number, hil_decision)

    print(f"Seeded {len(CASES)} MVP cases with scenario-rich read-only data.")


async def cleanup_existing():
    case_numbers = [item[0] for item in CASES]
    await execute(
        """
        DELETE FROM audit_logs
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        case_numbers,
    )
    await execute(
        """
        DELETE FROM hil_gates
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        case_numbers,
    )
    await execute(
        """
        DELETE FROM follow_ups
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        case_numbers,
    )
    await execute(
        """
        DELETE FROM pre_onboarding_tasks
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        case_numbers,
    )


async def _seed_tasks(case_id, index: int, status: str):
    for task_type, team, offset in [
        ("laptop_setup", "it", 1),
        ("email_id_creation", "it", 2),
        ("desk_allocation", "admin", 3),
        ("id_card_preparation", "admin", 4),
    ]:
        task_status = "completed" if status in {"in_progress", "completed"} and offset <= 2 else "in_progress"
        if status in {"blocked", "at_risk"} and offset >= 3:
            task_status = "overdue"
        await execute(
            """
            INSERT INTO pre_onboarding_tasks (case_id, task_type, assigned_team, description, due_date, status, sla_compliant, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            """,
            case_id,
            task_type,
            team,
            f"MVP scenario task: {task_type}",
            date.today() + timedelta(days=offset - index),
            task_status,
            task_status != "overdue",
        )


async def _seed_followups(case_id, index: int):
    for kind, days in [("t_minus_7", 7), ("t_minus_3", 3), ("t_plus_0", 0)]:
        sent = NOW - timedelta(days=max(0, days - index % 3))
        await execute(
            """
            INSERT INTO follow_ups (case_id, follow_up_type, scheduled_at, sent_at, channel, response_status, responded_at, notes, created_at)
            VALUES ($1, $2, $3, $4, 'email', $5, $6, 'MVP dummy follow-up', NOW())
            """,
            case_id,
            kind,
            NOW - timedelta(days=days),
            sent if index % 4 != 0 else None,
            "confirmed_joining" if index % 4 != 0 else "pending",
            sent if index % 4 != 0 else None,
        )


async def _seed_hil(case_id, candidate_id, employee_id, phase, first_name, last_name, case_number, decision):
    await execute(
        """
        INSERT INTO hil_gates (
          case_id, gate_type, decision, decided_at, is_blocking, flag_description,
          approval_token, token_expires_at, email_sent_to, email_sent_at, created_at, updated_at
        )
        VALUES ($1, 'doc_bg_verification', $2, $3, TRUE, $4, $5, $6,
                'hr-coordinator@mvp.aegis.local', NOW(), NOW(), NOW())
        """,
        case_id,
        decision,
        NOW if decision in {"approved", "rejected"} else None,
        f"Background verification scenario for {first_name} {last_name} / {case_number}",
        f"mvp-{case_number.lower()}-{decision}",
        NOW + timedelta(hours=48),
    )
    await _audit(case_id, candidate_id, employee_id, phase, "hil_decision", "HIL-1", f"Background verification {decision}.", decision)


async def _seed_audit(case_id, candidate_id, employee_id, phase, first_name, last_name, case_number, status):
    await _audit(case_id, candidate_id, employee_id, "pre_onboarding", "trigger", "BR-001", f"Pre-onboarding workflow triggered for {first_name} {last_name}.", "created")
    await _audit(case_id, candidate_id, employee_id, phase, "activity", "BR-001", f"Reminder timeline updated for {case_number}.", "sent")
    await _audit(case_id, candidate_id, employee_id, phase, "validation", "BR-002 v1.3", f"Document validation state is {status}.", status)


async def _audit(case_id, candidate_id, employee_id, phase, event_type, rule_ref, description, outcome):
    # AUDIT LOG IS APPEND-ONLY - seed inserts only; never update/delete audit logs.
    await execute(
        """
        INSERT INTO audit_logs (
          case_id, candidate_id, employee_id, phase, event_type, rule_ref,
          rule_version, event_description, outcome, agent_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'v1.3', $7, $8, 'AG-HR-0426-001', NOW())
        """,
        case_id,
        candidate_id,
        employee_id,
        phase,
        event_type,
        rule_ref,
        description,
        outcome,
    )


if __name__ == "__main__":
    asyncio.run(seed())
