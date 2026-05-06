from pydantic import BaseModel
from uuid import UUID
import datetime


class QapiItemOut(BaseModel):
    id: UUID
    qapi_id: UUID
    title: str
    order: int
    root_cause: str | None
    systemic_change: str | None
    monitoring_type: str | None
    monitoring_cadence: str | None
    monitoring_role: str | None
    responsible_person: str | None
    start_date: datetime.date | None
    expected_completion_date: datetime.date | None

    model_config = {"from_attributes": True}


class QapiItemCreate(BaseModel):
    title: str
    order: int = 0
    root_cause: str | None = None
    systemic_change: str | None = None
    monitoring_type: str | None = None
    monitoring_cadence: str | None = None
    monitoring_role: str | None = None
    responsible_person: str | None = None
    start_date: datetime.date | None = None
    expected_completion_date: datetime.date | None = None


class QapiItemUpdate(BaseModel):
    title: str | None = None
    order: int | None = None
    root_cause: str | None = None
    systemic_change: str | None = None
    monitoring_type: str | None = None
    monitoring_cadence: str | None = None
    monitoring_role: str | None = None
    responsible_person: str | None = None
    start_date: datetime.date | None = None
    expected_completion_date: datetime.date | None = None


class QapiOut(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: str
    issues_identified: str | None
    date_identified: datetime.date | None
    items: list[QapiItemOut] = []

    model_config = {"from_attributes": True}


class QapiCreate(BaseModel):
    title: str
    issues_identified: str | None = None
    date_identified: datetime.date | None = None


class QapiUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    issues_identified: str | None = None
    date_identified: datetime.date | None = None
