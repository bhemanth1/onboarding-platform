"""
Create and seed the PostgreSQL schema used by the Aegis desktop API.

Run from the backend folder:
    .\\.venv\\Scripts\\python.exe scripts\\seed_postgres_all.py

Or inside the backend container:
    python scripts/seed_postgres_all.py
"""
from __future__ import annotations

import argparse
import asyncio
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
from scripts.seed_mvp_data import CASES, NOW, seed as seed_mvp_data
from scripts.seed_role_profiles import PROFILES


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
            key, value = token.split("=", 1)
            kv[key.strip()] = value.strip().strip("'").strip('"')

    host = kv.get("host", "localhost")
    port = kv.get("port", "5432")
    dbname = kv.get("dbname") or kv.get("database", "")
    user = kv.get("user", "")
    password = kv.get("password", "")
    return f"postgresql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{dbname}", ssl_ctx


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create and seed all PostgreSQL tables used by the Aegis desktop API.")
    parser.add_argument("--schema-only", action="store_true", help="Create schema and tables without inserting demo data.")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    if not settings.DB_CON_STR.startswith(("postgresql", "postgres://")) and "host=" not in settings.DB_CON_STR:
        raise RuntimeError("DB_CON_STR must point to PostgreSQL to seed PostgreSQL data.")

    dsn, ssl_ctx = _dsn_and_ssl()
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
    try:
        await create_schema(conn)
        await conn.execute(f'SET search_path TO "{APP_SCHEMA}", public')
    finally:
        await conn.close()

    if args.schema_only:
        print(f"PostgreSQL schema '{APP_SCHEMA}' created.")
        return

    await seed_mvp_data()
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx, server_settings={"search_path": f"{APP_SCHEMA}, public"})
    try:
        await seed_role_profiles(conn)
        await seed_documents(conn)
        await seed_provisioning(conn)
        await seed_post_onboarding(conn)
    finally:
        await conn.close()

    print(f"PostgreSQL schema '{APP_SCHEMA}' created and all API tables seeded.")


async def create_schema(conn: asyncpg.Connection) -> None:
    await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{APP_SCHEMA}"')
    await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    await conn.execute(f'SET search_path TO "{APP_SCHEMA}", public')

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          personal_email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          role VARCHAR(150),
          department VARCHAR(150),
          manager_name VARCHAR(150),
          joining_date DATE,
          employee_type VARCHAR(100),
          office_location VARCHAR(150),
          nationality VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS onboarding_cases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_number VARCHAR(80) UNIQUE NOT NULL,
          candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          employee_id VARCHAR(80) UNIQUE,
          phase VARCHAR(80),
          status VARCHAR(80),
          pre_onboarding_progress INT DEFAULT 0,
          onboarding_progress INT DEFAULT 0,
          post_onboarding_progress INT DEFAULT 0,
          overall_progress INT DEFAULT 0,
          it_status VARCHAR(80),
          docs_status VARCHAR(80),
          payroll_status VARCHAR(80),
          pf_status VARCHAR(80),
          is_completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          sla_breach BOOLEAN DEFAULT FALSE,
          sla_pending_hil_started_at TIMESTAMPTZ,
          sla_escalated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
          document_type VARCHAR(120),
          file_name VARCHAR(255),
          status VARCHAR(80),
          rejection_reason TEXT,
          correction_instructions TEXT,
          submitted_at TIMESTAMPTZ,
          validated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS hil_gates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          gate_type VARCHAR(120),
          decision VARCHAR(80),
          decision_notes TEXT,
          decided_at TIMESTAMPTZ,
          is_blocking BOOLEAN DEFAULT TRUE,
          flag_description TEXT,
          approval_token TEXT UNIQUE,
          token_expires_at TIMESTAMPTZ,
          email_sent_to VARCHAR(255),
          email_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID REFERENCES onboarding_cases(id) ON DELETE SET NULL,
          candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
          employee_id VARCHAR(80),
          phase VARCHAR(80),
          event_type VARCHAR(120),
          rule_ref VARCHAR(120),
          rule_version VARCHAR(40),
          event_description TEXT,
          outcome VARCHAR(120),
          agent_id VARCHAR(120),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS pre_onboarding_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          task_type VARCHAR(120),
          assigned_team VARCHAR(120),
          description TEXT,
          due_date DATE,
          status VARCHAR(80),
          sla_compliant BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS follow_ups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          follow_up_type VARCHAR(120),
          scheduled_at TIMESTAMPTZ,
          sent_at TIMESTAMPTZ,
          channel VARCHAR(80),
          response_status VARCHAR(120),
          responded_at TIMESTAMPTZ,
          notes TEXT,
          template_version VARCHAR(20),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS provisioning_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          item_type VARCHAR(120),
          system_name VARCHAR(120),
          status VARCHAR(80),
          requested_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS post_onboarding_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          buddy_assigned BOOLEAN DEFAULT FALSE,
          manager_checkin BOOLEAN DEFAULT FALSE,
          policy_acknowledged BOOLEAN DEFAULT FALSE,
          payroll_confirmed BOOLEAN DEFAULT FALSE,
          pf_confirmed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS role_profiles (
          role_name VARCHAR(100) PRIMARY KEY,
          display_name VARCHAR(150) NOT NULL,
          initials VARCHAR(10),
          color VARCHAR(20),
          sort_order INT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID REFERENCES onboarding_cases(id) ON DELETE CASCADE,
          candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
          processing_category VARCHAR(100) NOT NULL,
          acknowledged_at TIMESTAMPTZ,
          ip_address VARCHAR(50),
          template_version VARCHAR(20),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_consents_case_id ON consents(case_id)"
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS email_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_name VARCHAR(100) NOT NULL,
          version VARCHAR(20) NOT NULL,
          content TEXT,
          approved_by VARCHAR(100),
          approved_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (template_name, version)
        )
        """
    )
    await conn.execute(
        """
        INSERT INTO email_templates (template_name, version, content, approved_by, approved_at, is_active)
        VALUES
          ('t_minus_7', 'v1.0',
           'Dear {{first_name}}, your joining date is in 7 days on {{joining_date}}. Please complete your onboarding documents at your earliest convenience.',
           'System', NOW(), TRUE),
          ('t_minus_3', 'v1.0',
           'Dear {{first_name}}, your joining date is in 3 days on {{joining_date}}. This is a reminder to ensure all onboarding tasks are completed.',
           'System', NOW(), TRUE),
          ('t_plus_0', 'v1.0',
           'Dear {{first_name}}, welcome to your first day! Your HR coordinator will be in touch shortly.',
           'System', NOW(), TRUE)
        ON CONFLICT (template_name, version) DO NOTHING
        """
    )


async def seed_role_profiles(conn: asyncpg.Connection) -> None:
    for profile in PROFILES:
        await conn.execute(
            """
            INSERT INTO role_profiles (
              role_name, display_name, initials, color, sort_order, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
            ON CONFLICT (role_name) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                initials = EXCLUDED.initials,
                color = EXCLUDED.color,
                sort_order = EXCLUDED.sort_order,
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            """,
            *profile,
        )


async def seed_documents(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        DELETE FROM documents
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        _case_numbers(),
    )
    rows = await conn.fetch(
        """
        SELECT oc.id AS case_id, oc.case_number, oc.candidate_id, oc.docs_status, c.first_name, c.last_name
        FROM onboarding_cases oc
        JOIN candidates c ON c.id = oc.candidate_id
        WHERE oc.case_number = ANY($1::varchar[])
        ORDER BY oc.case_number
        """,
        _case_numbers(),
    )
    for index, row in enumerate(rows, start=1):
        rejected = row["docs_status"] in {"correction_required", "rejected"}
        await conn.execute(
            """
            INSERT INTO documents (
              case_id, candidate_id, document_type, file_name, status,
              rejection_reason, correction_instructions, submitted_at, validated_at, created_at, updated_at
            )
            VALUES ($1, $2, 'identity_verification', $3, $4, $5, $6, $7, $8, NOW(), NOW())
            """,
            row["case_id"],
            row["candidate_id"],
            f"{row['case_number']}-identity.pdf",
            "correction_required" if rejected else (row["docs_status"] or "submitted"),
            "Address proof mismatch" if rejected else None,
            "Upload a current address proof and resubmit for HR verification." if rejected else None,
            NOW - timedelta(days=index),
            None if rejected else NOW - timedelta(days=max(0, index - 1)),
        )


async def seed_provisioning(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        DELETE FROM provisioning_items
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        _case_numbers(),
    )
    rows = await conn.fetch(
        "SELECT id, case_number, status FROM onboarding_cases WHERE case_number = ANY($1::varchar[])",
        _case_numbers(),
    )
    for row in rows:
        for item_type, system_name in [("email", "Google Workspace"), ("laptop", "IT Assets"), ("hrms", "HRMS")]:
            completed = row["status"] in {"completed", "in_progress"} and item_type != "laptop"
            failed = row["status"] == "blocked" and item_type == "hrms"
            status = "failed" if failed else ("completed" if completed else "pending")
            await conn.execute(
                """
                INSERT INTO provisioning_items (
                  case_id, item_type, system_name, status, requested_at, completed_at, notes, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', $5, $6, NOW(), NOW())
                """,
                row["id"],
                item_type,
                system_name,
                status,
                NOW if status == "completed" else None,
                "Seeded provisioning workflow item",
            )


async def seed_post_onboarding(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        DELETE FROM post_onboarding_items
        WHERE case_id IN (SELECT id FROM onboarding_cases WHERE case_number = ANY($1::varchar[]))
        """,
        _case_numbers(),
    )
    rows = await conn.fetch(
        "SELECT id, status, phase, overall_progress FROM onboarding_cases WHERE case_number = ANY($1::varchar[])",
        _case_numbers(),
    )
    for row in rows:
        progress = row["overall_progress"] or 0
        await conn.execute(
            """
            INSERT INTO post_onboarding_items (
              case_id, buddy_assigned, manager_checkin, policy_acknowledged,
              payroll_confirmed, pf_confirmed, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            """,
            row["id"],
            progress >= 50,
            progress >= 70,
            progress >= 80,
            progress >= 90,
            row["status"] == "completed",
        )


def _case_numbers() -> list[str]:
    return [item[0] for item in CASES]


if __name__ == "__main__":
    asyncio.run(main())
