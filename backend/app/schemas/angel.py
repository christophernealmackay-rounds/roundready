from pydantic import BaseModel
from uuid import UUID


class AngelOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str | None
    department: str | None
    department_id: UUID | None
    absent: bool
    absent_since: str | None
    resident_count: int = 0
    rounds_today: int = 0

    model_config = {"from_attributes": True}


class AngelCreate(BaseModel):
    user_id: UUID
    department_id: UUID | None = None


class AngelAbsent(BaseModel):
    absent: bool
