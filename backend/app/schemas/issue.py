from pydantic import BaseModel
from uuid import UUID


class IssueOut(BaseModel):
    id: UUID
    resident_name: str
    room: str | None
    angel_name: str
    issue: str
    raised_at: str
    resolved: bool
    resolved_by: str | None
    resolution_notes: str | None
    resolved_at: str | None
    question_text: str | None

    model_config = {"from_attributes": True}


class IssueResolve(BaseModel):
    resolved: bool
    resolved_by: str | None = None
    resolution_notes: str | None = None
