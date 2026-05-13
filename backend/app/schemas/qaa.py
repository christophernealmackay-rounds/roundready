from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class QaaMeetingNoteOut(BaseModel):
    id: UUID
    facility_id: UUID | None = None
    meeting_date: datetime.date
    title: str = ""
    content: str = ""
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class QaaMeetingNoteCreate(BaseModel):
    meeting_date: datetime.date
    title: str = ""
    content: str = ""


class QaaMeetingNoteUpdate(BaseModel):
    meeting_date: datetime.date | None = None
    title: str | None = None
    content: str | None = None
