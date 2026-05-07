from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel


class TemplateQuestionOut(BaseModel):
    id: UUID
    question_id: UUID
    text: str
    section: str = ""
    issue_on: str
    notify_department_id: UUID | None = None
    order: int

    model_config = {"from_attributes": True}


class TemplateSectionOut(BaseModel):
    id: UUID
    title: str
    qapi_id: UUID | None = None
    qapi_item_id: UUID | None = None
    order: int
    questions: list[TemplateQuestionOut] = []

    model_config = {"from_attributes": True}


class RoundTemplateOut(BaseModel):
    id: UUID
    name: str
    type: str  # angel | rapid
    active: bool
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    archived_at: datetime.datetime | None = None
    sections: list[TemplateSectionOut] = []

    model_config = {"from_attributes": True}


class RoundTemplateCreate(BaseModel):
    name: str
    type: str = "angel"
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None


class RoundTemplateUpdate(BaseModel):
    name: str | None = None
    active: bool | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    archived_at: datetime.datetime | None = None


class TemplateSectionCreate(BaseModel):
    title: str
    qapi_id: UUID | None = None
    qapi_item_id: UUID | None = None
    order: int = 0


class TemplateSectionUpdate(BaseModel):
    title: str | None = None
    qapi_id: UUID | None = None
    qapi_item_id: UUID | None = None
    order: int | None = None


class TemplateQuestionCreate(BaseModel):
    question_id: UUID
    order: int = 0


class RoundAnswerSubmit(BaseModel):
    question_id: UUID
    answer: bool | None
    issue_flagged: bool = False


class RoundSubmit(BaseModel):
    template_id: UUID
    angel_id: UUID
    resident_id: UUID
    answers: list[RoundAnswerSubmit]


class RoundOut(BaseModel):
    id: UUID
    template_id: UUID
    angel_id: UUID
    resident_id: UUID
    completed_at: datetime.datetime | None = None
    angel_name: str | None = None
    resident_name: str | None = None
    resident_room: str | None = None
    template_name: str | None = None
    flags_raised: int = 0

    model_config = {"from_attributes": True}


class QaaNoteOut(BaseModel):
    id: UUID
    facility_id: UUID | None = None
    content: str
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class QaaNoteUpdate(BaseModel):
    content: str
