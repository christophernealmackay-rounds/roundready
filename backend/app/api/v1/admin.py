"""
Admin endpoints. Gated behind DEMO_MODE=true so production deployments
return 404 even if this router is mounted.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.db.asyncpg_pool import acquire_conn
from app.seed import run_full_reset

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_demo_mode() -> None:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/seed-reset", status_code=200)
async def seed_reset() -> dict:
    """Drop all tables, recreate schema, load demo seed. Demo-only."""
    _require_demo_mode()
    async with acquire_conn() as conn:
        summary = await run_full_reset(conn)
    return {"status": "ok", "summary": summary}
