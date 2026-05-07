"""Round templates and round submissions."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.round import (
    RoundTemplateOut,
    RoundTemplateCreate,
    RoundOut,
    RoundSubmit,
)

router = APIRouter(prefix="/rounds", tags=["rounds"])


async def _build_template_out(t: dict, db: DB) -> dict:
    sections = await db.select("template_sections", {
        "template_id": f"eq.{t['id']}",
        "order": "order.asc",
    })
    enriched_sections = []
    for s in sections:
        tqs = await db.select("template_questions", {
            "section_id": f"eq.{s['id']}",
            "order": "order.asc",
        })
        questions = []
        for tq in tqs:
            qrows = await db.select("questions", {"id": f"eq.{tq['question_id']}"})
            if not qrows:
                continue
            q = qrows[0]
            questions.append({
                "id": tq["id"],
                "question_id": q["id"],
                "text": q["text"],
                "section": q.get("section", ""),
                "issue_on": q["issue_on"],
                "notify_department_id": q.get("notify_department_id"),
                "order": tq["order"],
            })
        enriched_sections.append({**s, "questions": questions})
    return {**t, "sections": enriched_sections}


@router.get("/templates", response_model=list[RoundTemplateOut])
async def list_templates(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    templates = await db.select("round_templates", {"order": "created_at.desc"})
    return [await _build_template_out(t, db) for t in templates]


@router.post("/templates", response_model=RoundTemplateOut, status_code=201)
async def create_template(
    body: RoundTemplateCreate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    data = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "type": body.type,
        "active": True,
        "start_date": body.start_date.isoformat() if body.start_date else None,
        "end_date": body.end_date.isoformat() if body.end_date else None,
    }
    t = await db.insert("round_templates", data)
    return await _build_template_out(t, db)


@router.get("", response_model=list[RoundOut])
async def list_rounds(
    angel_id: Optional[str] = None,
    resident_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    params: dict = {
        "order": "completed_at.desc.nullslast",
        "limit": str(limit),
    }
    if angel_id:
        params["angel_id"] = f"eq.{angel_id}"
    if resident_id:
        params["resident_id"] = f"eq.{resident_id}"
    if date_from and date_to:
        params["and"] = (
            f"(completed_at.gte.{date_from}T00:00:00Z,"
            f"completed_at.lte.{date_to}T23:59:59Z)"
        )
    elif date_from:
        params["completed_at"] = f"gte.{date_from}T00:00:00Z"
    elif date_to:
        params["completed_at"] = f"lte.{date_to}T23:59:59Z"

    rounds = await db.select("rounds", params)
    if not rounds:
        return []

    # Batch all join lookups so list returns in one round-trip per table
    # instead of N round-trips per round.
    residents = {
        r["id"]: r
        for r in await db.select("residents", {"select": "id,name,room"})
    }
    angels = {a["id"]: a for a in await db.select("angels", {"select": "id,user_id"})}
    users = {u["id"]: u for u in await db.select("users", {"select": "id,name"})}
    templates = {
        t["id"]: t for t in await db.select("round_templates", {"select": "id,name"})
    }

    # Pull all flagged answers for the rounds we care about in a single query.
    flagged = await db.select(
        "round_answers",
        {"select": "round_id", "issue_flagged": "eq.true"},
    )
    flag_count: dict[str, int] = {}
    for f in flagged:
        flag_count[f["round_id"]] = flag_count.get(f["round_id"], 0) + 1

    out = []
    for r in rounds:
        item = dict(r)
        if (resident := residents.get(r["resident_id"])):
            item["resident_name"] = resident["name"]
            item["resident_room"] = resident["room"]
        if (angel := angels.get(r["angel_id"])):
            if (user := users.get(angel["user_id"])):
                item["angel_name"] = user["name"]
        if (template := templates.get(r["template_id"])):
            item["template_name"] = template["name"]
        item["flags_raised"] = flag_count.get(r["id"], 0)
        out.append(item)
    return out


@router.post("", response_model=RoundOut, status_code=201)
async def submit_round(body: RoundSubmit, client: httpx.AsyncClient = Depends(get_db)):
    """
    Submit a completed round. Inserts the round + answers and auto-creates
    issues + notifications for any flagged answers.
    """
    db = DB(client)

    round_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    round_row = await db.insert("rounds", {
        "id": round_id,
        "template_id": str(body.template_id),
        "angel_id": str(body.angel_id),
        "resident_id": str(body.resident_id),
        "completed_at": now_iso,
    })

    flags_raised = 0
    for ans in body.answers:
        await db.insert("round_answers", {
            "id": str(uuid.uuid4()),
            "round_id": round_id,
            "question_id": str(ans.question_id),
            "answer": ans.answer,
            "issue_flagged": ans.issue_flagged,
        })
        if ans.issue_flagged:
            flags_raised += 1
            # Look up notify_department_id on the question
            qrows = await db.select("questions", {"id": f"eq.{ans.question_id}"})
            dept_id = qrows[0].get("notify_department_id") if qrows else None
            issue_id = str(uuid.uuid4())
            await db.insert("issues", {
                "id": issue_id,
                "round_id": round_id,
                "question_id": str(ans.question_id),
                "resident_id": str(body.resident_id),
                "angel_id": str(body.angel_id),
                "department_id": dept_id,
                "status": "open",
            })
            # Notify the first user in that department (if any).
            if dept_id:
                urows = await db.select("users", {
                    "department_id": f"eq.{dept_id}",
                    "active": "eq.true",
                    "limit": "1",
                })
                if urows:
                    await db.insert("issue_notifications", {
                        "id": str(uuid.uuid4()),
                        "issue_id": issue_id,
                        "notified_user_id": urows[0]["id"],
                        "notified_at": now_iso,
                        "channel": "in_app",
                    })
            # Always notify the DON (any admin).
            admin_rows = await db.select("users", {"role": "eq.admin", "limit": "1"})
            if admin_rows:
                await db.insert("issue_notifications", {
                    "id": str(uuid.uuid4()),
                    "issue_id": issue_id,
                    "notified_user_id": admin_rows[0]["id"],
                    "notified_at": now_iso,
                    "channel": "in_app",
                })

    return {**round_row, "flags_raised": flags_raised}
