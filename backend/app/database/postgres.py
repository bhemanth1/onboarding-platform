"""
PostgreSQL connection helpers for the AegisAI Aiven database.
"""
from urllib.parse import parse_qs, urlparse, urlunparse
import ssl

import asyncpg

from ..config import settings

_pool: asyncpg.Pool | None = None


def postgres_enabled() -> bool:
    """Return whether the current .env points to a PostgreSQL database."""
    return settings.DB_CON_STR.startswith("postgresql")


def _asyncpg_dsn() -> tuple[str, bool]:
    """Convert SQLAlchemy's asyncpg URL into an asyncpg-compatible DSN."""
    parsed = urlparse(settings.DB_CON_STR.replace("postgresql+asyncpg://", "postgresql://", 1))
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


async def init_pool() -> None:
    """Create the shared asyncpg pool used by all PostgreSQL endpoints."""
    global _pool
    if not postgres_enabled() or _pool is not None:
        return
    dsn, ssl_required = _asyncpg_dsn()
    _pool = await asyncpg.create_pool(
        dsn=dsn,
        ssl=_ssl_context(ssl_required),
        min_size=1,
        max_size=5,
        command_timeout=30,
    )


async def close_pool() -> None:
    """Close the shared asyncpg pool during application shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def _run(method: str, query: str, *args):
    """Run one operation through the shared pool, falling back to lazy init."""
    if not postgres_enabled():
        raise RuntimeError("PostgreSQL DB_CON_STR is not configured")
    if _pool is None:
        await init_pool()
    if _pool is not None:
        async with _pool.acquire() as conn:
            return await getattr(conn, method)(query, *args)

    dsn, ssl_required = _asyncpg_dsn()
    conn = await asyncpg.connect(dsn=dsn, ssl=_ssl_context(ssl_required))
    try:
        return await getattr(conn, method)(query, *args)
    finally:
        await conn.close()


def _ssl_context(ssl_required: bool):
    if not ssl_required:
        return False
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context
