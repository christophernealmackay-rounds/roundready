from pydantic import BaseModel
from uuid import UUID


class DepartmentOut(BaseModel):
    id: UUID
    name: str
    facility_id: UUID | None
    custom: bool

    model_config = {"from_attributes": True}


class DepartmentCreate(BaseModel):
    name: str
    facility_id: UUID | None = None
    custom: bool = False
