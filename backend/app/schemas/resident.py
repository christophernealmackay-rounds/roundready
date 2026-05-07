from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class ResidentOut(BaseModel):
    id: UUID
    name: str
    room: str
    bed: str
    angel_id: UUID | None = None
    status: str  # active | discharged | hospital
    pcc_id: str | None = None

    model_config = {"from_attributes": True}


class ResidentCreate(BaseModel):
    name: str
    room: str
    bed: str = "a"
    angel_id: UUID | None = None
    pcc_id: str | None = None


class ResidentAssign(BaseModel):
    angel_id: UUID | None
