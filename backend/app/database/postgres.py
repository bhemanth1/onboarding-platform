"""
PostgreSQL connection helpers for the AegisAI Aiven database.
"""
from urllib.parse import parse_qs, urlparse, urlunparse
import ssl

import asyncpg

from ..config import settings


def postgres_enabled() -> bool:
    """Return whether the current .env points to a PostgreSQL database."""
    return settings.DATABASE_URL.startswith("postgresql")


def _asyncpg_dsn() -> tuple[str, bool]:
    """Convert SQLAlchemy's asyncpg URL into an asyncpg-compatible DSN."""
    parsed = urlparse(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1))
    query = parse_qs(parsed.query)
    ssl_required = query.get("ssl", [""])[0] == "require" or query.get("sslmode", [""])[0] == "require"
    cleaned = parsed._replace(query="")
    return urlunparse(cleaned), ssl_required


async def fetch_rows(query: str, *args):
    """Run a read-only PostgreSQL query and return asyncpg records."""
    return await _run("fetch", query, *args)


async def fetch_row(query: str, *args):
    """Run a PostgreSQL query and return one row."""
    return await _run("fetchrow", query, *args)


async def execute(query: str, *args):
    """Run a PostgreSQL write statement."""
    return await _run("execute", query, *args)


async def _run(method: str, query: str, *args):
    """Open a short-lived asyncpg connection for a single operation."""
    dsn, ssl_required = _asyncpg_dsn()
    ssl_context = False
    if ssl_required:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    conn = await asyncpg.connect(dsn=dsn, ssl=ssl_context)
    try:
        return await getattr(conn, method)(query, *args)
    finally:
        await conn.close()
