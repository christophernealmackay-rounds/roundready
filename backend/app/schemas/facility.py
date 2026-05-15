from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FacilitySettingsOut(BaseModel):
    id: UUID
    facility_id: UUID | None = None
    licensed_bed_count: int
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class FacilitySettingsUpdate(BaseModel):
    licensed_bed_count: int = Field(ge=1)
