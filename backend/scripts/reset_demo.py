"""
CLI entry point for the demo reset.

Usage (from repo root):
    make demo-reset
or directly:
    cd backend && python -m scripts.reset_demo

Drops all tables, recreates them from db/schema.sql, and loads the
authoritative demo seed. Runs in a single transaction.
"""
from __future__ import annotations

import asyncio
import sys

import asyncpg

from app.core.config import settings
from app.db.asyncpg_pool import _normalize_dsn
from app.seed import run_full_reset


async def _main() -> int:
    dsn = _normalize_dsn(settings.database_url)
    print(f"Connecting to {dsn.split('@')[-1]}...")
    conn = await asyncpg.connect(dsn, ssl="require", statement_cache_size=0)
    try:
        print("Resetting schema and seeding demo data...")
        summary = await run_full_reset(conn)
    finally:
        await conn.close()

    print("Reset complete.")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
