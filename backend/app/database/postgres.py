"""
PostgreSQL connection helpers for the AegisAI Aiven database.
"""
import ssl
from urllib.parse import quote_plus

import asyncpg

from ..config import settings

_pool: asyncpg.Pool | None = None

APP_SCHEMA = "dana"


def postgres_enabled() -> bool:
    raw = _raw_connstr()
    return bool(raw) and (
        raw.startswith("postgresql")
        or raw.startswith("postgres://")
        or "host=" in raw
        or "dbname=" in raw
    )


def _raw_connstr() -> str:
    return (settings.DB_CON_STR or "").strip().strip('"').strip("'")


def _build_dsn_and_ssl() -> tuple[str, ssl.SSLContext]:
    """
    Returns a postgresql:// DSN + SSL context (cert verification disabled for Aiven).
    Accepts libpq key=value or postgresql:// URL.
    """
    raw = _raw_connstr()

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    # Already a URL
    if raw.startswith("postgresql") or raw.startswith("postgres://"):
        dsn = raw.replace("postgresql+asyncpg://", "postgresql://", 1).split("?")[0]
        return dsn, ssl_ctx

    # libpq key=value parsing — strip quotes from each value
    kv: dict[str, str] = {}
    for token in raw.split():
        if "=" in token:
            k, v = token.split("=", 1)
            kv[k.strip()] = v.strip().strip("'").strip('"')

    host = kv.get("host", "localhost")
    port = kv.get("port", "5432")
    dbname = kv.get("dbname") or kv.get("database", "")
    user = kv.get("user", "")
    password = kv.get("password", "")

    # sslmode intentionally excluded — ssl_ctx handles it
    dsn = (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{dbname}"
    )
    return dsn, ssl_ctx


def relation(name: str) -> str:
    """Return a schema-qualified relation name, e.g. dana.users"""
    import re
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise RuntimeError("relation name must be a valid PostgreSQL identifier")
    return f"{APP_SCHEMA}.{name}"


async def init_pool() -> None:
    global _pool
    if not postgres_enabled() or _pool is not None:
        return

    dsn, ssl_ctx = _build_dsn_and_ssl()
    _pool = await asyncpg.create_pool(
        dsn,
        ssl=ssl_ctx,
        min_size=1,
        max_size=5,
        command_timeout=30,
        server_settings={
            "search_path": f"{APP_SCHEMA}, public",  # app tables in dana; extensions/functions in public
        },
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def _run(method: str, query: str, *args):
    if not postgres_enabled():
        raise RuntimeError("PostgreSQL DB_CON_STR is not configured")
    if _pool is None:
        await init_pool()
    if _pool is not None:
        async with _pool.acquire() as conn:
            return await getattr(conn, method)(query, *args)

    # Fallback single connection
    dsn, ssl_ctx = _build_dsn_and_ssl()
    conn = await asyncpg.connect(
        dsn,
        ssl=ssl_ctx,
        server_settings={"search_path": f"{APP_SCHEMA}, public"},
    )
    try:
        return await getattr(conn, method)(query, *args)
    finally:
        await conn.close()


async def fetch_rows(query: str, *args):
    """Run a read-only PostgreSQL query and return asyncpg records."""
    return await _run("fetch", query, *args)


async def fetch_row(query: str, *args):
    """Run a PostgreSQL query and return one row."""
    return await _run("fetchrow", query, *args)


async def execute(query: str, *args):
    """Run a PostgreSQL write statement."""
    return await _run("execute", query, *args)
