from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class QuestionOut(BaseModel):
    id: UUID
    text: str
    section: str = ""
    issue_on: str  # yes | no | either
    notify_department_id: UUID | None = None
    in_repository: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    text: str
    section: str = ""
    issue_on: str = "either"
    notify_department_id: UUID | None = None
    in_repository: bool = False


class QuestionUpdate(BaseModel):
    text: str | None = None
    section: str | None = None
    issue_on: str | None = None
    notify_department_id: UUID | None = None
    in_repository: bool | None = None
