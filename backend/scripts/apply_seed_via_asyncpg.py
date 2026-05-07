"""
Apply the rendered seed SQL via asyncpg, fixing the Supabase pooler username
if the .env DATABASE_URL is missing the project-ref suffix.

Usage:
    python -m scripts.apply_seed_via_asyncpg path/to/seed_render.sql
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import asyncpg

from app.core.config import settings


def _fix_pooler_user(dsn: str) -> str:
    """If hostname is *.pooler.supabase.com and user is bare 'postgres',
    rewrite to 'postgres.<project_ref>' inferred from SUPABASE_URL."""
    if dsn.startswith("postgresql+asyncpg://"):
        dsn = "postgresql://" + dsn[len("postgresql+asyncpg://"):]
    parsed = urlparse(dsn)
    if not parsed.hostname or "pooler.supabase.com" not in parsed.hostname:
        return dsn
    if not parsed.username or "." in parsed.username:
        return dsn  # already includes project ref
    # Extract project ref from SUPABASE_URL (https://<ref>.supabase.co)
    sup = urlparse(settings.supabase_url)
    if not sup.hostname:
        return dsn
    ref = sup.hostname.split(".")[0]
    new_user = f"{parsed.username}.{ref}"
    netloc = f"{new_user}:{parsed.password}@{parsed.hostname}:{parsed.port}"
    return urlunparse(parsed._replace(netloc=netloc))


async def _main(sql_path: str) -> int:
    dsn = _fix_pooler_user(settings.database_url)
    masked = re.sub(r":[^@:]+@", ":****@", dsn)
    print(f"Connecting: {masked}")
    sql = Path(sql_path).read_text(encoding="utf-8")
    print(f"Loaded {len(sql):,} bytes from {sql_path}")
    # Supabase requires TLS on the pooler. Use 'require' (no cert verification)
    # since Supabase serves a Let's Encrypt cert that asyncpg's default won't
    # accept on Windows without a cafile.
    conn = await asyncpg.connect(dsn, ssl="require", statement_cache_size=0)  # noqa: E501 — pgbouncer-friendly
    try:
        async with conn.transaction():
            await conn.execute(sql)
        print("Seed applied OK")
    finally:
        await conn.close()
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python -m scripts.apply_seed_via_asyncpg <sql_file>", file=sys.stderr)
        sys.exit(2)
    sys.exit(asyncio.run(_main(sys.argv[1])))
