from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class ResidentGroupOut(BaseModel):
    id: UUID
    name: str
    type: str  # wing | cart | custom
    facility_id: UUID | None = None
    member_ids: list[UUID] = []

    model_config = {"from_attributes": True}


class ResidentGroupCreate(BaseModel):
    name: str
    type: str = "custom"
    facility_id: UUID | None = None


class ResidentGroupUpdate(BaseModel):
    name: str | None = None
    type: str | None = None


class ResidentGroupMembershipUpdate(BaseModel):
    resident_ids: list[UUID]
