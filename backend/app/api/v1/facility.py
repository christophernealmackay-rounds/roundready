"""Facility settings — one row per facility (licensed bed count)."""
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends

from app.db.client import get_db, DB
from app.schemas.facility import FacilitySettingsOut, FacilitySettingsUpdate

router = APIRouter(prefix="/facility-settings", tags=["facility-settings"])
# Same demo facility the qaa_notes / qaa_meeting_notes routes address.
FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


@router.get("", response_model=FacilitySettingsOut)
async def get_settings(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("facility_settings", {"facility_id": f"eq.{FACILITY_ID}"})
    if rows:
        return rows[0]
    return await db.insert("facility_settings", {
        "id": str(uuid.uuid4()),
        "facility_id": FACILITY_ID,
        "licensed_bed_count": 55,
    })


@router.put("", response_model=FacilitySettingsOut)
async def update_settings(
    body: FacilitySettingsUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("facility_settings", {"facility_id": f"eq.{FACILITY_ID}"})
    now = datetime.now(timezone.utc).isoformat()
    if rows:
        return await db.update(
            "facility_settings",
            {"facility_id": FACILITY_ID},
            {"licensed_bed_count": body.licensed_bed_count, "updated_at": now},
        )
    return await db.insert("facility_settings", {
        "id": str(uuid.uuid4()),
        "facility_id": FACILITY_ID,
        "licensed_bed_count": body.licensed_bed_count,
    })
