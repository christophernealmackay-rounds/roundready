from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IssueNotificationOut(BaseModel):
    id: UUID
    issue_id: UUID
    notified_user_id: UUID
    notified_user_name: str | None = None
    notified_at: datetime
    channel: str  # in_app | email

    model_config = {"from_attributes": True}


class IssueOut(BaseModel):
    id: UUID
    round_id: UUID | None = None
    question_id: UUID | None = None
    resident_id: UUID | None = None
    angel_id: UUID | None = None
    department_id: UUID | None = None
    status: str  # open | resolved
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_by: UUID | None = None
    resolution_notes: str | None = None
    # Display joins:
    resident_name: str | None = None
    room: str | None = None
    bed: str | None = None
    angel_name: str | None = None
    department_name: str | None = None
    question_text: str | None = None
    resolved_by_name: str | None = None
    notifications: list[IssueNotificationOut] = []

    model_config = {"from_attributes": True}


class IssueResolve(BaseModel):
    resolved_by: UUID
    resolution_notes: str
