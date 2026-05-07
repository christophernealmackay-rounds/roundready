from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class AngelOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    department_id: UUID | None = None
    department: str | None = None
    absent: bool
    absent_since: str | None = None
    resident_count: int = 0

    model_config = {"from_attributes": True}


class AngelCreate(BaseModel):
    user_id: UUID
    department_id: UUID | None = None


class AngelAbsent(BaseModel):
    absent: bool
