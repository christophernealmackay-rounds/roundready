"""Issues — first-class table with resolution tracking and notification trail."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.issue import IssueOut, IssueResolve, IssueNotificationOut

router = APIRouter(prefix="/issues", tags=["issues"])


async def _enrich(issue: dict, db: DB) -> dict:
    out = dict(issue)
    if issue.get("resident_id"):
        rrows = await db.select("residents", {"id": f"eq.{issue['resident_id']}"})
        if rrows:
            out["resident_name"] = rrows[0]["name"]
            out["room"] = rrows[0]["room"]
            out["bed"] = rrows[0]["bed"]
    if issue.get("angel_id"):
        arows = await db.select("angels", {"id": f"eq.{issue['angel_id']}"})
        if arows:
            urows = await db.select("users", {"id": f"eq.{arows[0]['user_id']}"})
            if urows:
                out["angel_name"] = urows[0]["name"]
    if issue.get("department_id"):
        drows = await db.select("departments", {"id": f"eq.{issue['department_id']}"})
        if drows:
            out["department_name"] = drows[0]["name"]
    if issue.get("question_id"):
        qrows = await db.select("questions", {"id": f"eq.{issue['question_id']}"})
        if qrows:
            out["question_text"] = qrows[0]["text"]
    if issue.get("resolved_by"):
        urows = await db.select("users", {"id": f"eq.{issue['resolved_by']}"})
        if urows:
            out["resolved_by_name"] = urows[0]["name"]
    # Notifications + their notified_user_name
    nrows = await db.select("issue_notifications", {
        "issue_id": f"eq.{issue['id']}",
        "order": "notified_at.asc",
    })
    notifications = []
    for n in nrows:
        urows = await db.select("users", {"id": f"eq.{n['notified_user_id']}"})
        notifications.append({**n, "notified_user_name": urows[0]["name"] if urows else None})
    out["notifications"] = notifications
    return out


@router.get("", response_model=list[IssueOut])
async def list_issues(
    status: str | None = None,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    params: dict = {"order": "created_at.desc"}
    if status in ("open", "resolved"):
        params["status"] = f"eq.{status}"
    issues = await db.select("issues", params)
    return [await _enrich(i, db) for i in issues]


@router.post("/{issue_id}/resolve", response_model=IssueOut)
async def resolve_issue(
    issue_id: uuid.UUID,
    body: IssueResolve,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("issues", {"id": f"eq.{issue_id}"})
    if not rows:
        raise HTTPException(404, "Issue not found")
    issue = await db.update("issues", {"id": str(issue_id)}, {
        "status": "resolved",
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "resolved_by": str(body.resolved_by),
        "resolution_notes": body.resolution_notes,
    })
    return await _enrich(issue, db)


@router.post("/{issue_id}/reopen", response_model=IssueOut)
async def reopen_issue(issue_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("issues", {"id": f"eq.{issue_id}"})
    if not rows:
        raise HTTPException(404, "Issue not found")
    issue = await db.update("issues", {"id": str(issue_id)}, {
        "status": "open",
        "resolved_at": None,
        "resolved_by": None,
        "resolution_notes": None,
    })
    return await _enrich(issue, db)
