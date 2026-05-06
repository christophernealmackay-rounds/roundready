from pydantic import BaseModel


class AngelStat(BaseModel):
    angel_name: str
    round_count: int
    completion_rate: float
    flags_raised: int


class DailyStat(BaseModel):
    date: str
    completed: int
    total: int
    rate: float


class ReportOut(BaseModel):
    total_rounds: int
    completed_rounds: int
    completion_rate: float
    total_flags: int
    open_issues: int
    resolved_issues: int
    angel_stats: list[AngelStat]
    daily_stats: list[DailyStat]
