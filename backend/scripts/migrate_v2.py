#!/usr/bin/env python3
"""
migrate_v2.py — Idempotent migration that adds all BRD v2 columns.
Mirrors migrate_v2.sql exactly.

Usage:
    cd onboarding-platform/backend
    python scripts/migrate_v2.py
"""
from __future__ import annotations

import asyncio
import ssl
import sys
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
        f"@{kv.get('host','localhost')}:{kv.get('port','5432')}/{kv.get('dbname') or kv.get('database','')}"
    )
    return dsn, ssl_ctx


async def run_migration(conn: asyncpg.Connection) -> None:
    schema = APP_SCHEMA
    print(f"Running v2 migration on schema '{schema}'...")

    # ── candidates: 6 new columns ─────────────────────────────────────────
    candidate_cols = [
        ("date_of_birth",                "DATE"),
        ("grade_band",                   "VARCHAR(50)"),
        ("country_of_employment",        "VARCHAR(100)"),
        ("european_country_of_employment","BOOLEAN DEFAULT FALSE"),
        ("permanent_address",            "TEXT"),
        ("emergency_contact",            "JSONB"),
    ]
    for col, col_type in candidate_cols:
        await conn.execute(
            f"ALTER TABLE {schema}.candidates ADD COLUMN IF NOT EXISTS {col} {col_type}"
        )
        print(f"  candidates.{col} — OK")

    # ── onboarding_cases: 8 new columns ───────────────────────────────────
    case_cols = [
        ("manager_notification_status",      "VARCHAR(80) DEFAULT 'not_sent'"),
        ("welcome_email_status",             "VARCHAR(80) DEFAULT 'not_sent'"),
        ("statutory_form_type",              "VARCHAR(120)"),
        ("statutory_form_submission_status", "VARCHAR(80) DEFAULT 'not_applicable'"),
        ("tax_statutory_config_status",      "VARCHAR(80) DEFAULT 'not_started'"),
        ("hr_signoff_status",                "VARCHAR(80) DEFAULT 'pending'"),
        ("it_admin_notification_failed",     "BOOLEAN DEFAULT FALSE"),
        ("it_admin_action_item_open",        "BOOLEAN DEFAULT FALSE"),
    ]
    for col, col_type in case_cols:
        await conn.execute(
            f"ALTER TABLE {schema}.onboarding_cases ADD COLUMN IF NOT EXISTS {col} {col_type}"
        )
        print(f"  onboarding_cases.{col} — OK")

    # ── email_templates: ensure content column exists ─────────────────────
    await conn.execute(
        f"ALTER TABLE {schema}.email_templates ADD COLUMN IF NOT EXISTS content TEXT"
    )
    print("  email_templates.content — OK")

    # ── role_profiles: ensure table exists (idempotent) ───────────────────
    await conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.role_profiles (
            role_name    VARCHAR(100) PRIMARY KEY,
            display_name VARCHAR(150) NOT NULL,
            initials     VARCHAR(10),
            color        VARCHAR(20),
            sort_order   INTEGER,
            is_active    BOOLEAN DEFAULT TRUE,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            updated_at   TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    print("  role_profiles table — OK")

    # ── Back-fill statutory_form_type from nationality ─────────────────────
    await conn.execute(
        f"""
        UPDATE {schema}.onboarding_cases oc
        SET statutory_form_type = CASE
            WHEN c.nationality IN ('Indian') THEN 'Form_12BB'
            WHEN c.nationality IN ('American') THEN 'W9'
            ELSE 'W8-BEN'
        END
        FROM {schema}.candidates c
        WHERE oc.candidate_id = c.id
          AND oc.statutory_form_type IS NULL
        """
    )
    print("  Back-fill onboarding_cases.statutory_form_type — OK")

    # ── Back-fill country_of_employment from nationality ──────────────────
    await conn.execute(
        f"""
        UPDATE {schema}.candidates
        SET country_of_employment = CASE nationality
            WHEN 'Indian'    THEN 'India'
            WHEN 'German'    THEN 'Germany'
            WHEN 'Spanish'   THEN 'Spain'
            WHEN 'Korean'    THEN 'South Korea'
            WHEN 'Russian'   THEN 'Russia'
            WHEN 'Chinese'   THEN 'China'
            WHEN 'Somali'    THEN 'Somalia'
            WHEN 'Egyptian'  THEN 'Egypt'
            WHEN 'Pakistani' THEN 'Pakistan'
            ELSE 'United States'
        END
        WHERE country_of_employment IS NULL AND nationality IS NOT NULL
        """
    )
    print("  Back-fill candidates.country_of_employment — OK")

    # ── Back-fill european_country_of_employment ──────────────────────────
    await conn.execute(
        f"""
        UPDATE {schema}.candidates
        SET european_country_of_employment = (
            nationality IN ('German', 'French', 'Italian', 'Spanish', 'Dutch', 'Belgian')
        )
        WHERE european_country_of_employment IS NULL
        """
    )
    print("  Back-fill candidates.european_country_of_employment — OK")

    print("Migration complete.")


async def main() -> None:
    dsn, ssl_ctx = _dsn_and_ssl()
    conn = await asyncpg.connect(
        dsn,
        ssl=ssl_ctx,
        server_settings={"search_path": f"{APP_SCHEMA}, public"},
    )
    try:
        await run_migration(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
