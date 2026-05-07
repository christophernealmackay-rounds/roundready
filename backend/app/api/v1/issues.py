"""Issues — first-class table with resolution tracking and notification trail."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.issue import IssueOut, IssueResolve, IssueNotificationOut

router = APIRouter(prefix="/issues", tags=["issues"])


async def _enrich_one(issue: dict, db: DB) -> dict:
    """Single-issue enrichment used by resolve/reopen. Slow path; that's OK."""
    out = dict(issue)
    lookup_tables = {
        "resident_id": ("residents", ["name", "room", "bed"], {"name": "resident_name"}),
        "department_id": ("departments", ["name"], {"name": "department_name"}),
        "question_id": ("questions", ["text"], {"text": "question_text"}),
    }
    for fk, (table, fields, rename) in lookup_tables.items():
        if issue.get(fk):
            rows = await db.select(table, {"id": f"eq.{issue[fk]}"})
            if rows:
                for f in fields:
                    out[rename.get(f, f)] = rows[0].get(f)
    if issue.get("angel_id"):
        arows = await db.select("angels", {"id": f"eq.{issue['angel_id']}"})
        if arows:
            urows = await db.select("users", {"id": f"eq.{arows[0]['user_id']}"})
            if urows:
                out["angel_name"] = urows[0]["name"]
    if issue.get("resolved_by"):
        urows = await db.select("users", {"id": f"eq.{issue['resolved_by']}"})
        if urows:
            out["resolved_by_name"] = urows[0]["name"]
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
    if not issues:
        return []

    # Batch all foreign-key lookups so the list returns in O(tables) round-trips
    # instead of O(issues × 6).
    residents = {r["id"]: r for r in await db.select("residents", {"select": "id,name,room,bed"})}
    angels = {a["id"]: a for a in await db.select("angels", {"select": "id,user_id"})}
    users = {u["id"]: u for u in await db.select("users", {"select": "id,name"})}
    departments = {d["id"]: d for d in await db.select("departments", {"select": "id,name"})}
    questions = {q["id"]: q for q in await db.select("questions", {"select": "id,text"})}

    notifs_by_issue: dict[str, list[dict]] = {}
    for n in await db.select("issue_notifications", {"order": "notified_at.asc"}):
        notifs_by_issue.setdefault(n["issue_id"], []).append(n)

    out = []
    for i in issues:
        item = dict(i)
        if (resident := residents.get(i.get("resident_id") or "")):
            item["resident_name"] = resident["name"]
            item["room"] = resident["room"]
            item["bed"] = resident["bed"]
        if (angel := angels.get(i.get("angel_id") or "")):
            if (user := users.get(angel["user_id"])):
                item["angel_name"] = user["name"]
        if (dept := departments.get(i.get("department_id") or "")):
            item["department_name"] = dept["name"]
        if (question := questions.get(i.get("question_id") or "")):
            item["question_text"] = question["text"]
        if (resolved_by := users.get(i.get("resolved_by") or "")):
            item["resolved_by_name"] = resolved_by["name"]
        item["notifications"] = [
            {**n, "notified_user_name": users.get(n["notified_user_id"], {}).get("name")}
            for n in notifs_by_issue.get(i["id"], [])
        ]
        out.append(item)
    return out


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
    return await _enrich_one(issue, db)


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
    return await _enrich_one(issue, db)
