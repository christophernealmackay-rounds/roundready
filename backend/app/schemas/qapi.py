from __future__ import annotations

import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

# Mirror schema CHECK constraints so bad input fails 422 instead of leaking
# Postgres CheckViolations through as 500s.
QapiStatus = Literal["active", "archived"]
MonitoringType = Literal["rounds", "completion", "cadence"]


class QapiItemOut(BaseModel):
    id: UUID
    qapi_id: UUID
    title: str
    root_cause: str = ""
    systemic_change: str = ""
    monitoring_type: str = "rounds"
    monitoring_detail: str = ""
    responsible: str = ""
    start_date: datetime.date | None = None
    expected_completion: datetime.date | None = None
    order: int = 0

    model_config = {"from_attributes": True}


class QapiItemCreate(BaseModel):
    title: str
    root_cause: str = ""
    systemic_change: str = ""
    monitoring_type: MonitoringType = "rounds"
    monitoring_detail: str = ""
    responsible: str = ""
    start_date: datetime.date | None = None
    expected_completion: datetime.date | None = None
    order: int = 0


class QapiItemUpdate(BaseModel):
    title: str | None = None
    root_cause: str | None = None
    systemic_change: str | None = None
    monitoring_type: MonitoringType | None = None
    monitoring_detail: str | None = None
    responsible: str | None = None
    start_date: datetime.date | None = None
    expected_completion: datetime.date | None = None
    order: int | None = None


class QapiOut(BaseModel):
    id: UUID
    title: str
    status: str  # active | archived
    issues_identified: str = ""
    date_identified: datetime.date | None = None
    # Populated only when the QAPI has been archived. Required by the route
    # handler before status can move to 'archived'; cleared on restore.
    actual_completion: datetime.date | None = None
    items: list[QapiItemOut] = []

    model_config = {"from_attributes": True}


class QapiCreate(BaseModel):
    title: str
    issues_identified: str = ""
    date_identified: datetime.date | None = None


class QapiUpdate(BaseModel):
    title: str | None = None
    status: QapiStatus | None = None
    issues_identified: str | None = None
    date_identified: datetime.date | None = None
    actual_completion: datetime.date | None = None
