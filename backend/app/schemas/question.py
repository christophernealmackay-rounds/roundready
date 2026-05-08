from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# Mirrors questions.issue_on CHECK constraint.
IssueOn = Literal["yes", "no", "either"]


class QuestionOut(BaseModel):
    id: UUID
    text: str
    section: str = ""
    issue_on: str
    notify_department_id: UUID | None = None
    in_repository: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    # An empty question is meaningless; reject at the schema layer.
    text: str = Field(min_length=1)
    section: str = ""
    issue_on: IssueOn = "either"
    notify_department_id: UUID | None = None
    in_repository: bool = False


class QuestionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    section: str | None = None
    issue_on: IssueOn | None = None
    notify_department_id: UUID | None = None
    in_repository: bool | None = None
