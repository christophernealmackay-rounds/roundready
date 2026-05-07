from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class AngelStat(BaseModel):
    angel_id: UUID
    angel_name: str
    round_count: int
    flags_raised: int


class DailyStat(BaseModel):
    date: str
    rounds: int


class ReportOut(BaseModel):
    total_rounds: int
    total_flags: int
    open_issues: int
    resolved_issues: int
    angel_stats: list[AngelStat]
    daily_stats: list[DailyStat]
