from pydantic import BaseModel, Field
from uuid import UUID


class DepartmentOut(BaseModel):
    id: UUID
    name: str
    facility_id: UUID | None
    custom: bool

    model_config = {"from_attributes": True}


class DepartmentCreate(BaseModel):
    # An empty department name produces a confusing dropdown row and breaks
    # routing summaries; reject at the schema layer.
    name: str = Field(min_length=1)
    facility_id: UUID | None = None
    custom: bool = False
