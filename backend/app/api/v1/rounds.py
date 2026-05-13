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
    RoundTemplateUpdate,
    TemplateSectionCreate,
    TemplateSectionUpdate,
    TemplateQuestionCreate,
    TemplateSectionOut,
    TemplateQuestionOut,
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
                "type": q.get("type", "yesno"),
                "scale_min": q.get("scale_min"),
                "scale_max": q.get("scale_max"),
                "scale_threshold": q.get("scale_threshold"),
                "scale_threshold_direction": q.get("scale_threshold_direction"),
                "order": tq["order"],
            })
        enriched_sections.append({**s, "questions": questions})

    # Rapid rounds expose a completion count so admins can see uptake at a
    # glance after deploying. Cheap COUNT — only ever a handful of rapid
    # templates exist at once, so a per-template SELECT is fine.
    rapid_completion_count = 0
    if t.get("type") == "rapid" and t.get("deployed_at"):
        completed = await db.select(
            "rounds",
            {"template_id": f"eq.{t['id']}", "select": "id"},
        )
        rapid_completion_count = len(completed)

    return {**t, "sections": enriched_sections, "rapid_completion_count": rapid_completion_count}


@router.get("/templates", response_model=list[RoundTemplateOut])
async def list_templates(client: httpx.AsyncClient = Depends(get_db)):
    """List all templates. Phase 4.2 contract: any active RapidRound whose
    end_date has passed gets auto-archived on retrieval, so admins don't
    have to babysit a "Stop" button when the survey window naturally ends.
    """
    db = DB(client)
    templates = await db.select("round_templates", {"order": "created_at.desc"})

    # Auto-archive expired rapid rounds before returning the list.
    today_iso = datetime.now(timezone.utc).date().isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    for t in templates:
        if (
            t.get("type") == "rapid"
            and t.get("active")
            and not t.get("archived_at")
            and t.get("end_date")
            and t["end_date"] < today_iso
        ):
            updated = await db.update(
                "round_templates",
                {"id": t["id"]},
                {"active": False, "archived_at": now_iso},
            )
            # Reflect the change in the in-memory copy so the response is
            # consistent without a re-fetch.
            t.update(updated)

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


@router.patch("/templates/{template_id}", response_model=RoundTemplateOut)
async def update_template(
    template_id: uuid.UUID,
    body: RoundTemplateUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("round_templates", {"id": f"eq.{template_id}"})
    if not rows:
        raise HTTPException(404, "Template not found")
    payload: dict = {}
    if body.name is not None:
        payload["name"] = body.name
    if body.active is not None:
        payload["active"] = body.active
    if body.start_date is not None:
        payload["start_date"] = body.start_date.isoformat()
    if body.end_date is not None:
        payload["end_date"] = body.end_date.isoformat()
    if body.archived_at is not None:
        payload["archived_at"] = body.archived_at.isoformat()
    if payload:
        t = await db.update("round_templates", {"id": str(template_id)}, payload)
    else:
        t = rows[0]
    return await _build_template_out(t, db)


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("round_templates", {"id": f"eq.{template_id}"})
    if not rows:
        raise HTTPException(404, "Template not found")
    # template_sections + template_questions cascade via FK ON DELETE CASCADE.
    await db.delete("round_templates", {"id": str(template_id)})
    return None


@router.post("/templates/{template_id}/deploy", response_model=RoundTemplateOut)
async def deploy_template(template_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    """Push a rapid round to angels.

    Sets `deployed_at` to NOW(). The angel rounding view filters by
    `deployed_at IS NOT NULL` (and type='rapid') to decide which rapid
    templates to bundle into the angel's queue. Only valid for rapid
    rounds — deploying an angel template would be meaningless since
    angels always see the active angel template.
    """
    db = DB(client)
    rows = await db.select("round_templates", {"id": f"eq.{template_id}"})
    if not rows:
        raise HTTPException(404, "Template not found")
    t = rows[0]
    if t.get("type") != "rapid":
        raise HTTPException(422, "Only rapid rounds can be deployed to angels")
    if t.get("deployed_at"):
        # Idempotent: already deployed → return as-is rather than 409 so the
        # UI can be optimistic without worrying about double-clicks.
        return await _build_template_out(t, db)
    now_iso = datetime.now(timezone.utc).isoformat()
    updated = await db.update(
        "round_templates",
        {"id": str(template_id)},
        {"deployed_at": now_iso},
    )
    return await _build_template_out(updated, db)


# ── Sections ───────────────────────────────────────────────────────────────

@router.post("/templates/{template_id}/sections", response_model=TemplateSectionOut, status_code=201)
async def create_section(
    template_id: uuid.UUID,
    body: TemplateSectionCreate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("round_templates", {"id": f"eq.{template_id}"})
    if not rows:
        raise HTTPException(404, "Template not found")
    section = await db.insert("template_sections", {
        "id": str(uuid.uuid4()),
        "template_id": str(template_id),
        "title": body.title,
        "qapi_id": str(body.qapi_id) if body.qapi_id else None,
        "qapi_item_id": str(body.qapi_item_id) if body.qapi_item_id else None,
        "order": body.order,
    })
    return {**section, "questions": []}


@router.patch("/sections/{section_id}", response_model=TemplateSectionOut)
async def update_section(
    section_id: uuid.UUID,
    body: TemplateSectionUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("template_sections", {"id": f"eq.{section_id}"})
    if not rows:
        raise HTTPException(404, "Section not found")
    payload: dict = {}
    if body.title is not None:
        payload["title"] = body.title
    if body.qapi_id is not None:
        payload["qapi_id"] = str(body.qapi_id)
    if body.qapi_item_id is not None:
        payload["qapi_item_id"] = str(body.qapi_item_id)
    if body.order is not None:
        payload["order"] = body.order
    if payload:
        section = await db.update("template_sections", {"id": str(section_id)}, payload)
    else:
        section = rows[0]
    # Re-pull questions for the response.
    tqs = await db.select("template_questions", {
        "section_id": f"eq.{section_id}",
        "order": "order.asc",
    })
    questions = []
    for tq in tqs:
        qrows = await db.select("questions", {"id": f"eq.{tq['question_id']}"})
        if qrows:
            q = qrows[0]
            questions.append({
                "id": tq["id"],
                "question_id": q["id"],
                "text": q["text"],
                "section": q.get("section", ""),
                "issue_on": q["issue_on"],
                "notify_department_id": q.get("notify_department_id"),
                "type": q.get("type", "yesno"),
                "scale_min": q.get("scale_min"),
                "scale_max": q.get("scale_max"),
                "scale_threshold": q.get("scale_threshold"),
                "scale_threshold_direction": q.get("scale_threshold_direction"),
                "order": tq["order"],
            })
    return {**section, "questions": questions}


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(section_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("template_sections", {"id": f"eq.{section_id}"})
    if not rows:
        raise HTTPException(404, "Section not found")
    await db.delete("template_sections", {"id": str(section_id)})
    return None


# ── Section ⇆ Question links ───────────────────────────────────────────────

@router.post(
    "/sections/{section_id}/questions",
    response_model=TemplateQuestionOut,
    status_code=201,
)
async def add_question_to_section(
    section_id: uuid.UUID,
    body: TemplateQuestionCreate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    s_rows = await db.select("template_sections", {"id": f"eq.{section_id}"})
    if not s_rows:
        raise HTTPException(404, "Section not found")
    q_rows = await db.select("questions", {"id": f"eq.{body.question_id}"})
    if not q_rows:
        raise HTTPException(404, "Question not found")
    tq = await db.insert("template_questions", {
        "id": str(uuid.uuid4()),
        "section_id": str(section_id),
        "question_id": str(body.question_id),
        "order": body.order,
    })
    q = q_rows[0]
    return {
        "id": tq["id"],
        "question_id": q["id"],
        "text": q["text"],
        "section": q.get("section", ""),
        "issue_on": q["issue_on"],
        "notify_department_id": q.get("notify_department_id"),
        "type": q.get("type", "yesno"),
        "scale_min": q.get("scale_min"),
        "scale_max": q.get("scale_max"),
        "scale_threshold": q.get("scale_threshold"),
        "scale_threshold_direction": q.get("scale_threshold_direction"),
        "order": tq["order"],
    }


@router.delete("/template-questions/{template_question_id}", status_code=204)
async def remove_question_from_section(
    template_question_id: uuid.UUID,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("template_questions", {"id": f"eq.{template_question_id}"})
    if not rows:
        raise HTTPException(404, "Template question not found")
    await db.delete("template_questions", {"id": str(template_question_id)})
    return None


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

    # Pull every answer for the rounds we care about — the dashboard's QAPI
    # compliance widget needs answer-level granularity, and an N+1 per round
    # was crippling. Use select_all to page past PostgREST's 1000-row cap.
    all_answers = await db.select_all(
        "round_answers",
        {"select": "round_id,question_id,answer,issue_flagged"},
    )
    answers_by_round: dict[str, list[dict]] = {}
    flag_count: dict[str, int] = {}
    for a in all_answers:
        rid = a["round_id"]
        answers_by_round.setdefault(rid, []).append({
            "question_id": a["question_id"],
            "answer": a.get("answer"),
            "issue_flagged": bool(a.get("issue_flagged")),
        })
        if a.get("issue_flagged"):
            flag_count[rid] = flag_count.get(rid, 0) + 1

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
        item["answers"] = answers_by_round.get(r["id"], [])
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
    # Pre-fetch every question referenced in this submission so we can compute
    # issue_flagged authoritatively server-side (clients can lie or get stale).
    referenced_ids = list({str(a.question_id) for a in body.answers})
    q_lookup: dict[str, dict] = {}
    if referenced_ids:
        ids_csv = ",".join(referenced_ids)
        q_rows = await db.select("questions", {"id": f"in.({ids_csv})"})
        q_lookup = {r["id"]: r for r in q_rows}

    for ans in body.answers:
        q = q_lookup.get(str(ans.question_id), {})
        qtype = q.get("type", "yesno")

        # Authoritative flag computation. For yes/no: matches AngelRoundFlow.
        # For scale: threshold + direction from the question definition.
        flagged = False
        if qtype == "scale" and ans.answer_number is not None:
            threshold = q.get("scale_threshold")
            direction = q.get("scale_threshold_direction")
            if threshold is not None and direction == "gte":
                flagged = ans.answer_number >= threshold
            elif threshold is not None and direction == "lte":
                flagged = ans.answer_number <= threshold
        elif qtype == "yesno" and ans.answer is not None:
            issue_on = q.get("issue_on", "either")
            if issue_on == "yes":
                flagged = bool(ans.answer)
            elif issue_on == "no":
                flagged = not bool(ans.answer)

        await db.insert("round_answers", {
            "id": str(uuid.uuid4()),
            "round_id": round_id,
            "question_id": str(ans.question_id),
            "answer": ans.answer,
            "answer_number": ans.answer_number,
            "issue_flagged": flagged,
        })
        if flagged:
            flags_raised += 1
            dept_id = q.get("notify_department_id")
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
