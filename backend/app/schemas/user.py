from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

# Mirrors the schema.sql CHECK constraint on users.role. Centralized here
# so a Pydantic 422 catches bad input *before* it hits Postgres and we get
# a useful error message instead of a 500.
UserRole = Literal["admin", "angel", "charge_nurse", "viewer"]


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] = {}
    active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    name: str
    email: str
    role: UserRole
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] = {}


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] | None = None
    active: bool | None = None
