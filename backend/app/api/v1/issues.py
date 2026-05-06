import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.issue import IssueOut, IssueResolve

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=list[IssueOut])
async def list_issues(status: str | None = None, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    params: dict = {"order": "raised_at.desc"}
    if status == "open":
        params["resolved"] = "eq.false"
    elif status == "resolved":
        params["resolved"] = "eq.true"
    return await db.select("issues", params)


@router.patch("/{issue_id}", response_model=IssueOut)
async def update_issue(issue_id: uuid.UUID, body: IssueResolve, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("issues", {"id": f"eq.{issue_id}"})
    if not rows:
        raise HTTPException(404, "Issue not found")

    data: dict = {"resolved": body.resolved}
    if body.resolved:
        data["resolved_by"] = body.resolved_by
        data["resolution_notes"] = body.resolution_notes
        data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    else:
        data["resolved_by"] = None
        data["resolution_notes"] = None
        data["resolved_at"] = None

    return await db.update("issues", {"id": str(issue_id)}, data)
