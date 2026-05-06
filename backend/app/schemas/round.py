from pydantic import BaseModel
from uuid import UUID


class TemplateQuestionOut(BaseModel):
    id: UUID
    position: int
    question_text: str
    question_type: str
    flags_on: str | None
    required: bool

    model_config = {"from_attributes": True}


class TemplateOut(BaseModel):
    id: UUID
    name: str
    frequency: str
    assigned_role: str
    active: bool
    questions: list[TemplateQuestionOut] = []

    model_config = {"from_attributes": True}


class RoundOut(BaseModel):
    id: UUID
    resident_name: str
    resident_room: str | None
    angel_name: str
    template_name: str
    submitted_at: str | None
    status: str
    questions_total: int
    questions_answered: int
    flags_raised: int

    model_config = {"from_attributes": True}


class QaaNoteOut(BaseModel):
    id: UUID
    facility_id: UUID | None
    content: str
    updated_at: str

    model_config = {"from_attributes": True}


class QaaNoteUpdate(BaseModel):
    content: str
