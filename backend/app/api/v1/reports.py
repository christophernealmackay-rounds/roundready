"""Aggregated reports against the new schema."""
from __future__ import annotations

from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends
import httpx

from app.db.client import get_db, DB
from app.schemas.report import ReportOut, AngelStat, DailyStat

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=ReportOut)
async def get_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    angel_id: Optional[str] = None,
    resident_id: Optional[str] = None,
    qapi_id: Optional[str] = None,
    qapi_item_id: Optional[str] = None,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)

    # Rounds in range
    round_params: dict = {"order": "completed_at.asc", "limit": "10000"}
    if date_from and date_to:
        round_params["and"] = (
            f"(completed_at.gte.{date_from}T00:00:00Z,"
            f"completed_at.lte.{date_to}T23:59:59Z)"
        )
    elif date_from:
        round_params["completed_at"] = f"gte.{date_from}T00:00:00Z"
    elif date_to:
        round_params["completed_at"] = f"lte.{date_to}T23:59:59Z"
    if angel_id:
        round_params["angel_id"] = f"eq.{angel_id}"
    if resident_id:
        round_params["resident_id"] = f"eq.{resident_id}"

    rounds = await db.select("rounds", round_params)

    # If filtering by QAPI / QAPI item, narrow rounds to those whose template has a section
    # tied to that QAPI/item. Cheap enough for the demo data volume.
    if qapi_id or qapi_item_id:
        section_filter: dict = {}
        if qapi_id:
            section_filter["qapi_id"] = f"eq.{qapi_id}"
        if qapi_item_id:
            section_filter["qapi_item_id"] = f"eq.{qapi_item_id}"
        sections = await db.select("template_sections", section_filter)
        template_ids = {s["template_id"] for s in sections}
        rounds = [r for r in rounds if r["template_id"] in template_ids]

    # Flag counts via round_answers
    total_flags = 0
    flag_by_angel: dict[str, int] = defaultdict(int)
    flag_by_round: dict[str, int] = defaultdict(int)
    for r in rounds:
        flags = await db.select("round_answers", {
            "round_id": f"eq.{r['id']}",
            "issue_flagged": "eq.true",
        })
        n = len(flags)
        total_flags += n
        flag_by_angel[r["angel_id"]] += n
        flag_by_round[r["id"]] = n

    # Issues in range
    issue_params: dict = {}
    if date_from and date_to:
        issue_params["and"] = (
            f"(created_at.gte.{date_from}T00:00:00Z,"
            f"created_at.lte.{date_to}T23:59:59Z)"
        )
    elif date_from:
        issue_params["created_at"] = f"gte.{date_from}T00:00:00Z"
    elif date_to:
        issue_params["created_at"] = f"lte.{date_to}T23:59:59Z"
    issues = await db.select("issues", issue_params)
    open_issues = sum(1 for i in issues if i.get("status") == "open")
    resolved_issues = sum(1 for i in issues if i.get("status") == "resolved")

    # Angel stats: count rounds per angel, look up name once
    rounds_by_angel: dict[str, int] = defaultdict(int)
    for r in rounds:
        rounds_by_angel[r["angel_id"]] += 1

    angel_stats: list[AngelStat] = []
    for aid, count in rounds_by_angel.items():
        arows = await db.select("angels", {"id": f"eq.{aid}"})
        name = ""
        if arows:
            urows = await db.select("users", {"id": f"eq.{arows[0]['user_id']}"})
            if urows:
                name = urows[0]["name"]
        angel_stats.append(AngelStat(
            angel_id=aid,
            angel_name=name,
            round_count=count,
            flags_raised=flag_by_angel.get(aid, 0),
        ))
    angel_stats.sort(key=lambda s: s.angel_name)

    # Daily stats
    daily: dict[str, int] = defaultdict(int)
    for r in rounds:
        c = r.get("completed_at")
        if not c:
            continue
        daily[c[:10]] += 1
    daily_stats = [DailyStat(date=d, rounds=n) for d, n in sorted(daily.items())]

    return ReportOut(
        total_rounds=len(rounds),
        total_flags=total_flags,
        open_issues=open_issues,
        resolved_issues=resolved_issues,
        angel_stats=angel_stats,
        daily_stats=daily_stats,
    )
