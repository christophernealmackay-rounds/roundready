from pydantic import BaseModel
from uuid import UUID


class UserOut(BaseModel):
    id: UUID
    facility_id: UUID | None
    full_name: str
    email: str | None
    department: str | None
    is_angel: bool
    is_admin: bool
    active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    full_name: str
    email: str | None = None
    department: str | None = None
    is_angel: bool = False
    is_admin: bool = False
    facility_id: UUID | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    department: str | None = None
    is_angel: bool | None = None
    is_admin: bool | None = None
    active: bool | None = None
