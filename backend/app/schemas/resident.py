from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class ResidentOut(BaseModel):
    id: UUID
    name: str
    room: str
    bed: str
    angel_id: UUID | None = None
    # Set when an angel is marked absent (preserving the pre-absence
    # assignment). Cleared on return-to-duty. While populated together with
    # a non-null angel_id, the resident is being temporarily covered.
    original_angel_id: UUID | None = None
    status: str  # active | discharged | hospital
    pcc_id: str | None = None

    model_config = {"from_attributes": True}


class ResidentCreate(BaseModel):
    # min_length=1 prevents empty-string saves that would otherwise render
    # as anonymous rows in the resident list.
    name: str = Field(min_length=1)
    room: str = Field(min_length=1)
    bed: str = Field(default="a", min_length=1)
    angel_id: UUID | None = None
    pcc_id: str | None = None


class ResidentAssign(BaseModel):
    angel_id: UUID | None
