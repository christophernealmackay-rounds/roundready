from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str  # admin | angel | charge_nurse | viewer
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] = {}
    active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] = {}


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    department_id: UUID | None = None
    notification_prefs: dict[str, Any] | None = None
    active: bool | None = None
