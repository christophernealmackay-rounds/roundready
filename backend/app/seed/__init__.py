"""
Demo reset orchestration.

Single source of truth for resetting the database to a known demo state.
Called by:
  - scripts/reset_demo.py        (CLI: `make demo-reset`)
  - api/v1/admin.py              (HTTP: POST /api/v1/admin/seed-reset)
  - tests/conftest.py            (pytest fixture)

Runs as one transaction:
  1. Execute db/schema.sql (DROP CASCADE + CREATE)
  2. Run app.seed.seed_data.run_seed(conn)
"""
from __future__ import annotations

from pathlib import Path

import asyncpg

# Path resolution: backend/app/seed/__init__.py -> repo root -> db/schema.sql
_SCHEMA_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "db" / "schema.sql"
)


async def run_full_reset(conn: asyncpg.Connection) -> dict:
    """
    Drop and recreate all tables, then load demo seed data. Atomic.
    Caller is responsible for opening/closing the connection.
    """
    from app.seed.seed_data import run_seed  # late import to avoid cycles

    schema_sql = _SCHEMA_PATH.read_text(encoding="utf-8")

    async with conn.transaction():
        await conn.execute(schema_sql)
        seed_summary = await run_seed(conn)

    return {"schema": str(_SCHEMA_PATH), **seed_summary}
