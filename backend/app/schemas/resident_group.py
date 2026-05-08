from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel

# Mirror resident_groups.type CHECK constraint.
GroupType = Literal["wing", "cart", "custom"]


class ResidentGroupOut(BaseModel):
    id: UUID
    name: str
    type: str
    facility_id: UUID | None = None
    member_ids: list[UUID] = []

    model_config = {"from_attributes": True}


class ResidentGroupCreate(BaseModel):
    name: str
    type: GroupType = "custom"
    facility_id: UUID | None = None


class ResidentGroupUpdate(BaseModel):
    name: str | None = None
    type: GroupType | None = None


class ResidentGroupMembershipUpdate(BaseModel):
    resident_ids: list[UUID]
