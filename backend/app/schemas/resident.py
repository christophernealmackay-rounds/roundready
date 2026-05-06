from pydantic import BaseModel
from uuid import UUID


class ResidentOut(BaseModel):
    id: int
    full_name: str
    room: int
    bed: str
    primary_angel_id: UUID | None
    active: bool
    facility_id: UUID | None
    pcc_id: str | None

    model_config = {"from_attributes": True}


class ResidentAssign(BaseModel):
    primary_angel_id: UUID | None
