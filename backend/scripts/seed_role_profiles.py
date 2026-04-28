r"""
Seed DB-backed role profile identities.

Run from the backend folder:
  .\.venv\Scripts\python.exe scripts\seed_role_profiles.py
"""
from __future__ import annotations

import asyncio
import os
import sqlite3
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse, urlunparse
import ssl

import asyncpg
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from app.database.postgres import APP_SCHEMA

PROFILES = [
    ("HR Coordinator", "Jagadeeswar R", "JR", "#5929d0", 1),
    ("HR Ops Manager", "Nandita Mehta", "NM", "#CF008B", 2),
    ("Onboarding Employee", "Amina Yusuf", "AY", "#0E2E89", 3),
    ("IT Support", "Kiran Patel", "KP", "#E4902E", 4),
    ("Admin Team", "Asha Rao", "AR", "#16A34A", 5),
]


def asyncpg_dsn(raw_dsn: str) -> tuple[str, bool]:
    parsed = urlparse(raw_dsn.replace("postgresql+asyncpg://", "postgresql://", 1))
    query = parse_qs(parsed.query)
    ssl_required = query.get("ssl", [""])[0] == "require" or query.get("sslmode", [""])[0] == "require"
    return urlunparse(parsed._replace(query="")), ssl_required


def ssl_context(required: bool):
    if not required:
        return False
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context


async def seed_postgres(dsn: str) -> None:
    clean_dsn, ssl_required = asyncpg_dsn(dsn)
    conn = await asyncpg.connect(clean_dsn, ssl=ssl_context(ssl_required))
    try:
        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{APP_SCHEMA}"')
        await conn.execute(f'SET search_path TO "{APP_SCHEMA}", public')
        await conn.execute(
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
    finally:
        await conn.close()


def seed_sqlite() -> None:
    conn = sqlite3.connect(ROOT / "aegis.db")
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS role_profiles (
              role_name TEXT PRIMARY KEY,
              display_name TEXT NOT NULL,
              initials TEXT,
              color TEXT,
              sort_order INTEGER DEFAULT 0,
              is_active BOOLEAN DEFAULT 1,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO role_profiles
            (role_name, display_name, initials, color, sort_order, is_active, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            """,
            PROFILES,
        )
        conn.commit()
    finally:
        conn.close()


async def main() -> None:
    dsn = os.getenv("DB_CON_STR", "")
    if dsn.startswith("postgresql"):
        await seed_postgres(dsn)
    else:
        seed_sqlite()
    print("Role profiles seeded.")


if __name__ == "__main__":
    asyncio.run(main())
