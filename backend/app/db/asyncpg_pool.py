"""
Async asyncpg pool for paths that need raw SQL or transactional control
(notably the demo-reset, which must drop+recreate+reseed atomically).

Read-side endpoints continue to use the PostgREST httpx client in client.py.
"""
from __future__ import annotations

import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncIterator

from app.core.config import settings

_pool: asyncpg.Pool | None = None


def _normalize_dsn(dsn: str) -> str:
    """Strip SQLAlchemy-style driver suffix and, if hitting the Supabase pooler
    with a bare 'postgres' user, append the project ref inferred from
    SUPABASE_URL. asyncpg wants pure postgresql:// scheme."""
    from urllib.parse import urlparse, urlunparse

    if dsn.startswith("postgresql+asyncpg://"):
        dsn = "postgresql://" + dsn[len("postgresql+asyncpg://"):]
    elif dsn.startswith("postgres+asyncpg://"):
        dsn = "postgresql://" + dsn[len("postgres+asyncpg://"):]

    parsed = urlparse(dsn)
    if (
        parsed.hostname
        and "pooler.supabase.com" in parsed.hostname
        and parsed.username
        and "." not in parsed.username
    ):
        sup = urlparse(settings.supabase_url)
        ref = (sup.hostname or "").split(".")[0]
        if ref:
            new_user = f"{parsed.username}.{ref}"
            netloc = f"{new_user}:{parsed.password}@{parsed.hostname}:{parsed.port}"
            dsn = urlunparse(parsed._replace(netloc=netloc))
    return dsn


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=_normalize_dsn(settings.database_url),
            min_size=1,
            max_size=4,
            command_timeout=60,
            ssl="require",  # Supabase pooler requires TLS
            statement_cache_size=0,  # pgbouncer transaction-mode pooler doesn't support prepared statements
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def acquire_conn() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
