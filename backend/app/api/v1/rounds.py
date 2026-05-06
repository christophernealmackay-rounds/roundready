from typing import Optional
from fastapi import APIRouter, Depends
import httpx

from app.db.client import get_db, DB
from app.schemas.round import TemplateOut, RoundOut

router = APIRouter(prefix="/rounds", tags=["rounds"])


@router.get("/templates", response_model=list[TemplateOut])
async def list_templates(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    templates = await db.select("templates", {"order": "started_at.desc"})
    out = []
    for t in templates:
        questions = await db.select("template_questions", {
            "template_id": f"eq.{t['id']}",
            "order": "position.asc",
        })
        out.append({**t, "questions": questions})
    return out


@router.get("", response_model=list[RoundOut])
async def list_rounds(
    angel_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 200,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    params: dict = {"status": "eq.completed", "order": "submitted_at.desc", "limit": str(limit)}
    if angel_id:
        params["angel_id"] = f"eq.{angel_id}"
    if date_from:
        params["submitted_at"] = f"gte.{date_from}T00:00:00Z"
    if date_to:
        # Override with lte if also have gte — PostgREST uses separate params
        params.pop("submitted_at", None)
        if date_from:
            params["and"] = f"(submitted_at.gte.{date_from}T00:00:00Z,submitted_at.lte.{date_to}T23:59:59Z)"
        else:
            params["submitted_at"] = f"lte.{date_to}T23:59:59Z"
    return await db.select("rounds", params)
