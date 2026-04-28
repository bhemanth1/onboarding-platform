#!/usr/bin/env python3
"""
seed_v2.py — Full data seed that exactly mirrors dml.sql.
All 12 BRD v2 cases with documents, HIL gates, follow-ups,
pre-onboarding tasks, provisioning items, post-onboarding items,
audit logs, role profiles, and email templates.

Usage:
    cd onboarding-platform/backend
    python scripts/seed_v2.py              # migrate columns + seed all data
    python scripts/seed_v2.py --no-migrate  # skip column migration
    python scripts/seed_v2.py --dry-run     # print counts without committing
"""
from __future__ import annotations

import argparse
import asyncio
import json
import ssl
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

from app.config import settings
from app.database.postgres import APP_SCHEMA

# ─────────────────────────────────────────────────────────────────────────────
# Seed data — mirrors dml.sql exactly
# Columns: idx, case_number, employee_id, first_name, last_name, email,
#          role, department, phase, status, progress, it_status, docs_status,
#          sla_breach, hil_decision, nationality, grade_band,
#          mgr_notif_status, welcome_status, statutory_form,
#          hr_signoff, it_notif_failed, it_action_open
# ─────────────────────────────────────────────────────────────────────────────
SEED_ROWS = [
    (1,  "OB-MVP-1001","EMP-MVP-1001","Nisha",  "Rao",    "nisha.rao@mvp.aegis.local",    "Product Manager",    "Product",    "pre_onboarding", "AWAITING_SUBMISSION",  35, "in_progress",    "not_started",        False, None,      "Indian",   "L3","not_sent","not_sent","Form_12BB","pending",   False,False),
    (2,  "OB-MVP-1002","EMP-MVP-1002","Daniel", "Kim",    "daniel.kim@mvp.aegis.local",    "Backend Engineer",   "Engineering","onboarding",     "HOLD_HR_APPROVAL",     58, "completed",      "validated",          False, "pending", "Korean",   "L2","sent",    "not_sent","W8-BEN",   "pending",   False,False),
    (3,  "OB-MVP-1003","EMP-MVP-1003","Maya",   "Iyer",   "maya.iyer@mvp.aegis.local",     "UX Researcher",      "Design",     "onboarding",     "PROVISIONING",         72, "completed",      "validated",          False, "approved","Indian",   "L2","sent",    "not_sent","Form_12BB","pending",   False,False),
    (4,  "OB-MVP-1004","EMP-MVP-1004","Omar",   "Hassan", "omar.hassan@mvp.aegis.local",   "Finance Analyst",    "Finance",    "onboarding",     "REJECTED",             48, "blocked",        "rejected",           False, "rejected","Egyptian", "L2","not_sent","not_sent","W8-BEN",   "pending",   False,False),
    (5,  "OB-MVP-1005","EMP-MVP-1005","Elena",  "Petrova","elena.petrova@mvp.aegis.local", "Compliance Lead",    "Legal",      "post_onboarding","HOLD_HR_SIGNOFF",      82, "completed",      "validated",          True,  "approved","Russian",  "L4","sent",    "sent",    "W8-BEN",   "pending",   False,False),
    (6,  "OB-MVP-1006","EMP-MVP-1006","Karthik","Menon",  "karthik.menon@mvp.aegis.local", "Data Analyst",       "Analytics",  "completed",      "COMPLETE",             100,"completed",      "validated",          False, "approved","Indian",   "L2","sent",    "sent",    "Form_12BB","signed_off",False,False),
    (7,  "OB-MVP-1007","EMP-MVP-1007","Sofia",  "Garcia", "sofia.garcia@mvp.aegis.local",  "HR Specialist",      "HR",         "pre_onboarding", "HOLD_LATE_SUBMISSION", 18, "not_started",    "not_submitted",      True,  None,      "Spanish",  "L2","not_sent","not_sent","W8-BEN",   "pending",   False,False),
    (8,  "OB-MVP-1008","EMP-MVP-1008","Lucas",  "Meyer",  "lucas.meyer@mvp.aegis.local",   "DevOps Engineer",    "Engineering","onboarding",     "PROVISIONING",         64, "failed_retrying","correction_required",False, "approved","German",   "L2","sent",    "not_sent","W8-BEN",   "pending",   True, True ),
    (9,  "OB-MVP-1009","EMP-MVP-1009","Amina",  "Yusuf",  "amina.yusuf@mvp.aegis.local",   "Payroll Coordinator","Finance",    "onboarding",     "PAYROLL_SETUP",        69, "completed",      "validated",          False, "approved","Somali",   "L2","sent",    "not_sent","W8-BEN",   "pending",   False,False),
    (10, "OB-MVP-1010","EMP-MVP-1010","Wei",    "Zhang",  "wei.zhang@mvp.aegis.local",     "IT Support",         "IT",         "post_onboarding","WELCOME_SENT",         91, "completed",      "validated",          False, "approved","Chinese",  "L2","sent",    "sent",    "W8-BEN",   "pending",   False,False),
    (11, "OB-MVP-1011","EMP-MVP-1011","Fatima", "Khan",   "fatima.khan@mvp.aegis.local",   "Security Engineer",  "Security",   "onboarding",     "HOLD_HR_APPROVAL",     52, "completed",      "validated",          False, "pending", "Pakistani","L2","sent",    "not_sent","W8-BEN",   "pending",   False,False),
    (12, "OB-MVP-1012","EMP-MVP-1012","Noah",   "Wilson", "noah.wilson@mvp.aegis.local",   "Sales Operations",   "Revenue",    "pre_onboarding", "CREATED",              24, "in_queue",       "partial",            False, None,      "American", "L1","not_sent","not_sent","W9",       "pending",   False,False),
]

ROLE_PROFILES = [
    ("HR Coordinator",      "Jagadeeswar R",  "JR", "#5929d0", 1),
    ("HR Ops Manager",      "Nandita Mehta",  "NM", "#CF008B", 2),
    ("Onboarding Employee", "Amina Yusuf",    "AY", "#0E2E89", 3),
    ("IT Support",          "Kiran Patel",    "KP", "#E4902E", 4),
    ("Admin Team",          "Asha Rao",       "AR", "#16A34A", 5),
    ("Compliance Reviewer", "Riya Sharma",    "RS", "#0E766E", 6),
    ("HR Platform Engineer","Arjun Dev",      "AD", "#7C3AED", 7),
]

EMAIL_TEMPLATES = [
    ("t_minus_7",          "v1.0", "Dear {{first_name}}, your joining date at Centific is in 7 days on {{joining_date}}. Please complete your onboarding documents (identity proof, address proof, employment agreement) before your start date. Contact your HR Coordinator if you have questions.", "Jagadeeswar R"),
    ("t_minus_3",          "v1.0", "Dear {{first_name}}, only 3 days until you join us on {{joining_date}}! This is a reminder to ensure all onboarding documents are submitted and validated. Your IT setup request has been raised. See you soon!", "Nandita Mehta"),
    ("t_plus_0",           "v1.0", "Dear {{first_name}}, welcome to your first day at Centific! Your HR Coordinator {{hr_coordinator}} will meet you at reception. Your laptop and email account are ready. We look forward to having you on board!", "Jagadeeswar R"),
    ("manager_notification","v1.0", "Dear {{manager_name}}, we would like to inform you that {{first_name}} {{last_name}} will be joining your team as {{role}} on {{joining_date}}. Please ensure their desk, access card, and system access are ready. Their HR case reference is {{case_number}}.", "Nandita Mehta"),
    ("welcome_pack",       "v1.0", "Dear {{first_name}}, attached is your onboarding welcome pack. It contains your joining instructions, company policies, and a checklist of items to complete in your first week. Your buddy {{buddy_name}} will reach out to schedule a welcome call.", "Nandita Mehta"),
    ("sla_escalation",     "v1.0", "This is an automated escalation notice. Case {{case_number}} for employee {{first_name}} {{last_name}} has reached 75% of the 4-business-hour HIL SLA window. Immediate review is required to avoid a breach.", "System"),
]

PRE_OB_TASKS = [
    ("laptop_setup",        "it",    1),
    ("email_id_creation",   "it",    2),
    ("desk_allocation",     "admin", 3),
    ("id_card_preparation", "admin", 4),
]

FOLLOW_UP_TYPES = [
    ("t_minus_7", 7),
    ("t_minus_3", 3),
    ("t_plus_0",  0),
]

PROVISIONING_ITEMS = [
    ("laptop",        "Laptop Provisioning", "Laptop allocation and base software setup"),
    ("email_account", "Email Account",        "Corporate email account creation"),
    ("access_card",   "Office Access Card",   "Office access card activation"),
]

DOC_TYPES = [
    (1, "identity_proof"),
    (2, "employment_agreement"),
    (3, "address_proof"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _today() -> date:
    return date.today()


def _office_location(department: str) -> str:
    d = department.lower()
    if d in ("engineering", "it", "security"):
        return "Hyderabad Tech Park"
    if d in ("finance", "legal"):
        return "Mumbai Office"
    return "Bengaluru HQ"


def _permanent_address(department: str) -> str:
    d = department.lower()
    if d in ("engineering", "it", "security"):
        return "Plot 12, Hitech City, Hyderabad 500081"
    if d in ("finance", "legal"):
        return "4th Floor, BKC Complex, Mumbai 400051"
    return "14, MG Road, Bengaluru 560001"


def _country_of_employment(nationality: str) -> str:
    return {
        "Indian":    "India",
        "German":    "Germany",
        "Spanish":   "Spain",
        "Korean":    "South Korea",
        "Russian":   "Russia",
        "Chinese":   "China",
        "Somali":    "Somalia",
        "Egyptian":  "Egypt",
        "Pakistani": "Pakistan",
    }.get(nationality, "United States")


def _is_european(nationality: str) -> bool:
    return nationality in ("German", "French", "Italian", "Spanish", "Dutch", "Belgian")


def _date_of_birth(idx: int) -> date:
    # DATE '1990-01-01' + (idx * 365 + idx * 17) days
    return date(1990, 1, 1) + timedelta(days=idx * 382)


def _pre_ob_progress(phase: str, progress: int) -> int:
    if phase == "pre_onboarding":
        return progress
    return min(progress, 100)


def _onboarding_progress(phase: str, progress: int) -> int:
    if phase == "onboarding":
        return progress
    if phase in ("post_onboarding", "completed"):
        return 100
    return 0


def _post_ob_progress(phase: str, progress: int) -> int:
    if phase == "post_onboarding":
        return progress
    if phase == "completed":
        return 100
    return 0


def _payroll_status(case_number: str, progress: int) -> str:
    if case_number == "OB-MVP-1009":
        return "failed"
    if progress > 70:
        return "completed"
    return "not_started"


def _pf_status(case_number: str, progress: int) -> str:
    if case_number == "OB-MVP-1005":
        return "overdue"
    if progress == 100:
        return "completed"
    return "not_started"


def _task_status(case_status: str, offset_days: int) -> str:
    if case_status == "COMPLETE":
        return "completed"
    if case_status in ("in_progress", "pending_hil", "AWAITING_SUBMISSION") and offset_days <= 2:
        return "completed"
    if case_status in ("blocked", "REJECTED") and offset_days >= 3:
        return "overdue"
    return "in_progress"


def _doc_status(docs_status: str, doc_type: str, doc_order: int) -> str:
    if docs_status in ("validated", "approved"):
        return "validated"
    if docs_status == "rejected" and doc_type == "address_proof":
        return "rejected"
    if docs_status == "correction_required" and doc_type == "identity_proof":
        return "correction_required"
    if docs_status in ("not_submitted", "not_started"):
        return "pending"
    if docs_status == "partial" and doc_order == 1:
        return "submitted"
    if docs_status == "partial":
        return "pending"
    return docs_status


def _prov_status(it_status: str, item_type: str) -> str:
    if it_status == "completed":
        return "completed"
    if it_status == "failed_retrying" and item_type == "access_card":
        return "failed_retrying"
    if it_status == "blocked" and item_type != "email_account":
        return "blocked"
    if it_status in ("not_started", "in_queue"):
        return it_status
    return "in_progress"


# ─────────────────────────────────────────────────────────────────────────────
# Connection
# ─────────────────────────────────────────────────────────────────────────────

def _dsn_and_ssl() -> tuple[str, ssl.SSLContext]:
    raw = (settings.DB_CON_STR or "").strip().strip('"').strip("'")
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    if raw.startswith("postgresql") or raw.startswith("postgres://"):
        return raw.replace("postgresql+asyncpg://", "postgresql://", 1).split("?")[0], ssl_ctx
    kv: dict[str, str] = {}
    for token in raw.split():
        if "=" in token:
            k, v = token.split("=", 1)
            kv[k.strip()] = v.strip().strip("'").strip('"')
    dsn = (
        f"postgresql://{quote_plus(kv.get('user',''))}:{quote_plus(kv.get('password',''))}"
        f"@{kv.get('host','localhost')}:{kv.get('port','5432')}"
        f"/{kv.get('dbname') or kv.get('database','')}"
    )
    return dsn, ssl_ctx


# ─────────────────────────────────────────────────────────────────────────────
# Seed functions
# ─────────────────────────────────────────────────────────────────────────────

async def truncate_all(conn: asyncpg.Connection) -> None:
    print("Truncating all tables...")
    await conn.execute(
        """
        TRUNCATE TABLE
            audit_logs,
            hil_gates,
            post_onboarding_items,
            provisioning_items,
            documents,
            follow_ups,
            pre_onboarding_tasks,
            onboarding_cases,
            candidates,
            role_profiles
        RESTART IDENTITY CASCADE
        """
    )
    print("  Truncate complete.")


async def seed_candidates(conn: asyncpg.Connection) -> dict[str, str]:
    """Returns {email: candidate_id}"""
    print("Seeding candidates...")
    today = _today()
    id_map: dict[str, str] = {}

    for row in SEED_ROWS:
        idx = row[0]
        first_name, last_name, email = row[3], row[4], row[5]
        role, department, nationality, grade_band = row[6], row[7], row[15], row[16]

        rec = await conn.fetchrow(
            """
            INSERT INTO candidates (
                first_name, last_name, personal_email, phone, role, department,
                manager_name, joining_date, employee_type, office_location, nationality,
                date_of_birth, grade_band, country_of_employment,
                european_country_of_employment, permanent_address, emergency_contact,
                created_at, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
            RETURNING id
            """,
            first_name,
            last_name,
            email,
            f"+91-90000-{idx:05d}",
            role,
            department,
            "Nandita Mehta",
            today + timedelta(days=idx - 5),
            "new_hire",
            _office_location(department),
            nationality,
            _date_of_birth(idx),
            grade_band,
            _country_of_employment(nationality),
            _is_european(nationality),
            _permanent_address(department),
            json.dumps({
                "name":     f"Emergency Contact {idx}",
                "phone":    f"+91-9000{idx}",
                "relation": "Spouse",
            }),
            _now() - timedelta(days=idx),
            _now(),
        )
        id_map[email] = str(rec["id"])

    print(f"  {len(SEED_ROWS)} candidates inserted.")
    return id_map


async def seed_cases(conn: asyncpg.Connection, cand_id_map: dict[str, str]) -> dict[str, str]:
    """Returns {case_number: case_id}"""
    print("Seeding onboarding cases...")
    today = _today()
    case_id_map: dict[str, str] = {}

    for row in SEED_ROWS:
        (idx, case_number, employee_id, first_name, last_name, email,
         role, department, phase, status, progress, it_status, docs_status,
         sla_breach, hil_decision, nationality, grade_band,
         mgr_notif_status, welcome_status, statutory_form,
         hr_signoff, it_notif_failed, it_action_open) = row

        candidate_id = cand_id_map[email]
        is_completed = (status == "COMPLETE")
        completed_at = (_now() - timedelta(days=1)) if is_completed else None

        rec = await conn.fetchrow(
            """
            INSERT INTO onboarding_cases (
                case_number, candidate_id, employee_id, phase, status,
                pre_onboarding_progress, onboarding_progress, post_onboarding_progress,
                overall_progress, it_status, docs_status, payroll_status, pf_status,
                is_completed, completed_at, sla_breach,
                manager_notification_status, welcome_email_status,
                statutory_form_type, statutory_form_submission_status,
                tax_statutory_config_status, hr_signoff_status,
                it_admin_notification_failed, it_admin_action_item_open,
                created_at, updated_at
            )
            VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,$10,$11,$12,$13,
                $14,$15,$16,
                $17,$18,$19,$20,$21,$22,$23,$24,
                $25,$26
            )
            RETURNING id
            """,
            case_number,
            candidate_id,
            employee_id,
            phase,
            status,
            _pre_ob_progress(phase, progress),
            _onboarding_progress(phase, progress),
            _post_ob_progress(phase, progress),
            progress,
            it_status,
            docs_status,
            _payroll_status(case_number, progress),
            _pf_status(case_number, progress),
            is_completed,
            completed_at,
            sla_breach,
            mgr_notif_status,
            welcome_status,
            statutory_form,
            "submitted" if progress >= 80 else "not_submitted",
            "configured" if it_status == "completed" else "not_started",
            hr_signoff,
            it_notif_failed,
            it_action_open,
            _now() - timedelta(days=idx),
            _now(),
        )
        case_id_map[case_number] = str(rec["id"])

    print(f"  {len(SEED_ROWS)} cases inserted.")
    return case_id_map


async def seed_pre_onboarding_tasks(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
) -> None:
    print("Seeding pre-onboarding tasks...")
    today = _today()
    count = 0

    for row in SEED_ROWS:
        idx, case_number = row[0], row[1]
        status = row[9]
        case_id = case_id_map[case_number]

        for task_type, assigned_team, offset_days in PRE_OB_TASKS:
            t_status = _task_status(status, offset_days)
            sla_compliant = not (status in ("blocked", "REJECTED") and offset_days >= 3)
            await conn.execute(
                """
                INSERT INTO pre_onboarding_tasks (
                    case_id, task_type, assigned_team, description,
                    due_date, status, sla_compliant, created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                """,
                case_id,
                task_type,
                assigned_team,
                f"MVP scenario task: {task_type}",
                today + timedelta(days=offset_days - idx),
                t_status,
                sla_compliant,
                _now() - timedelta(days=idx),
            )
            count += 1

    print(f"  {count} pre-onboarding tasks inserted.")


async def seed_follow_ups(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
) -> None:
    print("Seeding follow-ups...")
    count = 0

    for row in SEED_ROWS:
        idx, case_number = row[0], row[1]
        case_id = case_id_map[case_number]

        for follow_up_type, days_before in FOLLOW_UP_TYPES:
            is_sent = (idx % 4 != 0)
            sent_at = (
                _now() - timedelta(days=max(0, days_before - (idx % 3)))
                if is_sent else None
            )
            await conn.execute(
                """
                INSERT INTO follow_ups (
                    case_id, follow_up_type, scheduled_at, sent_at, channel,
                    response_status, responded_at, notes, created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                """,
                case_id,
                follow_up_type,
                _now() - timedelta(days=days_before),
                sent_at,
                "email",
                "pending" if not is_sent else "confirmed_joining",
                sent_at,
                f"MVP dummy follow-up for {follow_up_type}",
                _now(),
            )
            count += 1

    print(f"  {count} follow-ups inserted.")


async def seed_documents(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
    cand_id_map: dict[str, str],
) -> None:
    print("Seeding documents...")
    count = 0

    for row in SEED_ROWS:
        idx, case_number, employee_id = row[0], row[1], row[2]
        email, docs_status = row[5], row[12]
        case_id = case_id_map[case_number]
        candidate_id = cand_id_map[email]

        for doc_order, doc_type in DOC_TYPES:
            status = _doc_status(docs_status, doc_type, doc_order)
            has_submitted = docs_status not in ("not_submitted", "not_started")
            has_validated = docs_status in ("validated", "approved")

            rejection_reason = (
                "Address proof failed verification."
                if docs_status == "rejected" and doc_type == "address_proof"
                else None
            )
            correction_instructions = (
                "Upload a clearer identity proof scan."
                if docs_status == "correction_required" and doc_type == "identity_proof"
                else None
            )

            await conn.execute(
                """
                INSERT INTO documents (
                    case_id, candidate_id, document_type, file_name, status,
                    submitted_at, validated_at, rejection_reason, correction_instructions,
                    created_at, updated_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                case_id,
                candidate_id,
                doc_type,
                f"{employee_id.lower()}_{doc_type}.pdf",
                status,
                (_now() - timedelta(days=doc_order)) if has_submitted else None,
                (_now() - timedelta(days=doc_order - 1)) if has_validated else None,
                rejection_reason,
                correction_instructions,
                _now() - timedelta(days=idx),
                _now(),
            )
            count += 1

    print(f"  {count} documents inserted.")


async def seed_provisioning(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
) -> None:
    print("Seeding provisioning items...")
    count = 0

    for row in SEED_ROWS:
        idx, case_number = row[0], row[1]
        it_status = row[11]
        case_id = case_id_map[case_number]

        for item_type, system_name, notes in PROVISIONING_ITEMS:
            status = _prov_status(it_status, item_type)
            await conn.execute(
                """
                INSERT INTO provisioning_items (
                    case_id, item_type, system_name, status,
                    requested_at, completed_at, notes, created_at, updated_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                """,
                case_id,
                item_type,
                system_name,
                status,
                _now() - timedelta(days=idx),
                (_now() - timedelta(days=1)) if it_status == "completed" else None,
                notes,
                _now() - timedelta(days=idx),
                _now(),
            )
            count += 1

    print(f"  {count} provisioning items inserted.")


async def seed_post_onboarding(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
) -> None:
    print("Seeding post-onboarding items...")
    count = 0

    for row in SEED_ROWS:
        idx, case_number = row[0], row[1]
        phase, status, progress = row[8], row[9], row[10]
        case_id = case_id_map[case_number]

        pf_status_val = _pf_status(case_number, progress)
        in_late_phases = phase in ("post_onboarding", "completed")
        pf_confirmed = in_late_phases and (pf_status_val != "overdue")

        await conn.execute(
            """
            INSERT INTO post_onboarding_items (
                case_id, payroll_confirmed, pf_confirmed, buddy_assigned,
                manager_checkin, policy_acknowledged, created_at, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            """,
            case_id,
            in_late_phases,
            pf_confirmed,
            in_late_phases,
            phase == "completed",
            status == "COMPLETE",
            _now() - timedelta(days=idx),
            _now(),
        )
        count += 1

    print(f"  {count} post-onboarding items inserted.")


async def seed_hil_gates(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
) -> None:
    print("Seeding HIL gates...")
    count = 0

    for row in SEED_ROWS:
        idx, case_number = row[0], row[1]
        first_name, last_name = row[3], row[4]
        hil_decision = row[14]
        if hil_decision is None:
            continue
        case_id = case_id_map[case_number]

        decided_at = (_now() - timedelta(hours=2)) if hil_decision in ("approved", "rejected") else None
        decision_notes = (
            f"Seeded HR {hil_decision} decision." if hil_decision in ("approved", "rejected") else None
        )

        await conn.execute(
            """
            INSERT INTO hil_gates (
                case_id, gate_type, decision, decided_at, decision_notes,
                is_blocking, flag_description, approval_token, token_expires_at,
                email_sent_to, email_sent_at, created_at, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """,
            case_id,
            "doc_bg_verification",
            hil_decision,
            decided_at,
            decision_notes,
            True,
            f"Background verification scenario for {first_name} {last_name} / {case_number}",
            f"mvp-{case_number.lower()}-{hil_decision}",
            _now() + timedelta(hours=48),
            "hr-coordinator@mvp.aegis.local",
            _now() - timedelta(hours=1),
            _now() - timedelta(days=idx),
            _now(),
        )
        count += 1

    print(f"  {count} HIL gates inserted.")


async def seed_audit_logs(
    conn: asyncpg.Connection,
    case_id_map: dict[str, str],
    cand_id_map: dict[str, str],
) -> None:
    print("Seeding audit logs...")
    count = 0
    agent_id = "AG-HR-0426-001"

    for row in SEED_ROWS:
        idx, case_number, employee_id = row[0], row[1], row[2]
        first_name, last_name, email = row[3], row[4], row[5]
        phase, status, hil_decision = row[8], row[9], row[14]
        case_id = case_id_map[case_number]
        candidate_id = cand_id_map[email]

        # 3 standard audit events per case
        events = [
            ("pre_onboarding", "trigger",    "BR-001",       f"Pre-onboarding workflow triggered for {first_name} {last_name}.",    "created",  idx * 4),
            (phase,            "activity",   "BR-001",       f"Reminder timeline updated for {case_number}.",                       "sent",     idx * 4 - 1),
            (phase,            "validation", "BR-002 v1.3",  f"Document validation state is {status}.",                             status,     idx * 4 - 2),
        ]
        for ev_phase, ev_type, rule_ref, description, outcome, offset_hrs in events:
            await conn.execute(
                """
                INSERT INTO audit_logs (
                    case_id, candidate_id, employee_id, phase, event_type,
                    rule_ref, rule_version, event_description, outcome, agent_id, created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                case_id, candidate_id, employee_id,
                ev_phase, ev_type, rule_ref, "v1.3",
                description, outcome, agent_id,
                _now() - timedelta(hours=offset_hrs),
            )
            count += 1

        # HIL decision audit (only for cases with a hil_decision)
        if hil_decision is not None:
            await conn.execute(
                """
                INSERT INTO audit_logs (
                    case_id, candidate_id, employee_id, phase, event_type,
                    rule_ref, rule_version, event_description, outcome, agent_id, created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                case_id, candidate_id, employee_id,
                phase, "hil_decision", "HIL-1", "v1.3",
                f"Background verification {hil_decision}.",
                hil_decision, agent_id,
                _now() - timedelta(minutes=30),
            )
            count += 1

    print(f"  {count} audit log entries inserted.")


async def seed_role_profiles(conn: asyncpg.Connection) -> None:
    print("Seeding role profiles...")
    for role_name, display_name, initials, color, sort_order in ROLE_PROFILES:
        await conn.execute(
            """
            INSERT INTO role_profiles (
                role_name, display_name, initials, color, sort_order,
                is_active, created_at, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,TRUE,NOW(),NOW())
            ON CONFLICT (role_name) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                initials     = EXCLUDED.initials,
                color        = EXCLUDED.color,
                sort_order   = EXCLUDED.sort_order,
                is_active    = EXCLUDED.is_active,
                updated_at   = NOW()
            """,
            role_name, display_name, initials, color, sort_order,
        )
    print(f"  {len(ROLE_PROFILES)} role profiles upserted.")


async def seed_email_templates(conn: asyncpg.Connection) -> None:
    print("Seeding email templates...")
    for template_name, version, content, approved_by in EMAIL_TEMPLATES:
        await conn.execute(
            """
            INSERT INTO email_templates (
                template_name, version, content, approved_by, approved_at, is_active
            )
            VALUES ($1,$2,$3,$4,NOW(),TRUE)
            ON CONFLICT (template_name, version) DO UPDATE
            SET content     = EXCLUDED.content,
                approved_by = EXCLUDED.approved_by,
                approved_at = NOW(),
                is_active   = EXCLUDED.is_active
            """,
            template_name, version, content, approved_by,
        )
    print(f"  {len(EMAIL_TEMPLATES)} email templates upserted.")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

async def main(no_migrate: bool = False, dry_run: bool = False) -> None:
    dsn, ssl_ctx = _dsn_and_ssl()

    # 1. Optionally run migration to add v2 columns
    if not no_migrate:
        print("\n=== Step 1: Running v2 column migration ===")
        from scripts.migrate_v2 import run_migration
        mig_conn = await asyncpg.connect(
            dsn, ssl=ssl_ctx,
            server_settings={"search_path": f"{APP_SCHEMA}, public"},
        )
        try:
            await run_migration(mig_conn)
        finally:
            await mig_conn.close()
    else:
        print("\n=== Step 1: Skipping migration (--no-migrate) ===")

    # 2. Seed data
    print("\n=== Step 2: Seeding data ===")
    conn = await asyncpg.connect(
        dsn, ssl=ssl_ctx,
        server_settings={"search_path": f"{APP_SCHEMA}, public"},
    )
    try:
        if dry_run:
            print("DRY RUN — no data will be written. Printing row counts only.")
            print(f"  Would insert: {len(SEED_ROWS)} candidates")
            print(f"  Would insert: {len(SEED_ROWS)} cases")
            print(f"  Would insert: {len(SEED_ROWS) * len(PRE_OB_TASKS)} pre-onboarding tasks")
            print(f"  Would insert: {len(SEED_ROWS) * len(FOLLOW_UP_TYPES)} follow-ups")
            print(f"  Would insert: {len(SEED_ROWS) * len(DOC_TYPES)} documents")
            print(f"  Would insert: {len(SEED_ROWS) * len(PROVISIONING_ITEMS)} provisioning items")
            print(f"  Would insert: {len(SEED_ROWS)} post-onboarding items")
            hil_count = sum(1 for r in SEED_ROWS if r[14] is not None)
            print(f"  Would insert: {hil_count} HIL gates")
            audit_count = len(SEED_ROWS) * 3 + hil_count
            print(f"  Would insert: {audit_count} audit log entries")
            print(f"  Would upsert: {len(ROLE_PROFILES)} role profiles")
            print(f"  Would upsert: {len(EMAIL_TEMPLATES)} email templates")
            return

        async with conn.transaction():
            await truncate_all(conn)
            cand_id_map = await seed_candidates(conn)
            case_id_map = await seed_cases(conn, cand_id_map)
            await seed_pre_onboarding_tasks(conn, case_id_map)
            await seed_follow_ups(conn, case_id_map)
            await seed_documents(conn, case_id_map, cand_id_map)
            await seed_provisioning(conn, case_id_map)
            await seed_post_onboarding(conn, case_id_map)
            await seed_hil_gates(conn, case_id_map)
            await seed_audit_logs(conn, case_id_map, cand_id_map)
            await seed_role_profiles(conn)
            await seed_email_templates(conn)

        print("\n=== Seed complete! All data committed. ===")
    finally:
        await conn.close()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed AEGIS v2 data into PostgreSQL.")
    p.add_argument("--no-migrate", action="store_true", help="Skip column migration step.")
    p.add_argument("--dry-run",    action="store_true", help="Print counts without writing.")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(main(no_migrate=args.no_migrate, dry_run=args.dry_run))
