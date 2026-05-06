from typing import Optional
from fastapi import APIRouter, Depends
import httpx

from app.db.client import get_db, DB
from app.schemas.report import ReportOut, AngelStat, DailyStat

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=ReportOut)
async def get_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    angel_name: Optional[str] = None,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)

    # Build round filter
    round_params: dict = {"order": "submitted_at.asc", "limit": "5000"}
    if date_from and date_to:
        round_params["and"] = f"(submitted_at.gte.{date_from}T00:00:00Z,submitted_at.lte.{date_to}T23:59:59Z)"
    elif date_from:
        round_params["submitted_at"] = f"gte.{date_from}T00:00:00Z"
    elif date_to:
        round_params["submitted_at"] = f"lte.{date_to}T23:59:59Z"
    if angel_name:
        round_params["angel_name"] = f"eq.{angel_name}"

    rounds = await db.select("rounds", round_params)

    total = len(rounds)
    completed = sum(1 for r in rounds if r.get("status") == "completed")
    completion_rate = round(completed / total * 100, 1) if total else 0.0
    total_flags = sum(r.get("flags_raised", 0) for r in rounds)

    # Issues
    issue_params: dict = {}
    if date_from and date_to:
        issue_params["and"] = f"(raised_at.gte.{date_from}T00:00:00Z,raised_at.lte.{date_to}T23:59:59Z)"
    elif date_from:
        issue_params["raised_at"] = f"gte.{date_from}T00:00:00Z"
    elif date_to:
        issue_params["raised_at"] = f"lte.{date_to}T23:59:59Z"

    issues = await db.select("issues", issue_params)
    open_issues = sum(1 for i in issues if not i.get("resolved"))
    resolved_issues = sum(1 for i in issues if i.get("resolved"))

    # Angel stats
    angel_map: dict[str, dict] = {}
    for r in rounds:
        name = r.get("angel_name", "Unknown")
        if name not in angel_map:
            angel_map[name] = {"round_count": 0, "completed": 0, "flags": 0}
        angel_map[name]["round_count"] += 1
        if r.get("status") == "completed":
            angel_map[name]["completed"] += 1
        angel_map[name]["flags"] += r.get("flags_raised", 0)

    angel_stats = [
        AngelStat(
            angel_name=name,
            round_count=v["round_count"],
            completion_rate=round(v["completed"] / v["round_count"] * 100, 1) if v["round_count"] else 0.0,
            flags_raised=v["flags"],
        )
        for name, v in sorted(angel_map.items())
    ]

    # Daily stats
    daily_map: dict[str, dict] = {}
    for r in rounds:
        submitted = r.get("submitted_at") or r.get("created_at", "")
        if not submitted:
            continue
        day = submitted[:10]
        if day not in daily_map:
            daily_map[day] = {"total": 0, "completed": 0}
        daily_map[day]["total"] += 1
        if r.get("status") == "completed":
            daily_map[day]["completed"] += 1

    daily_stats = [
        DailyStat(
            date=day,
            completed=v["completed"],
            total=v["total"],
            rate=round(v["completed"] / v["total"] * 100, 1) if v["total"] else 0.0,
        )
        for day, v in sorted(daily_map.items())
    ]

    return ReportOut(
        total_rounds=total,
        completed_rounds=completed,
        completion_rate=completion_rate,
        total_flags=total_flags,
        open_issues=open_issues,
        resolved_issues=resolved_issues,
        angel_stats=angel_stats,
        daily_stats=daily_stats,
    )
