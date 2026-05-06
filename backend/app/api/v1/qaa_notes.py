import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
import httpx

from app.db.client import get_db, DB
from app.schemas.round import QaaNoteOut, QaaNoteUpdate

router = APIRouter(prefix="/qaa-notes", tags=["qaa-notes"])
FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


@router.get("", response_model=QaaNoteOut)
async def get_notes(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qaa_notes", {"facility_id": f"eq.{FACILITY_ID}"})
    if rows:
        return rows[0]
    # Create empty record
    return await db.insert("qaa_notes", {"id": str(uuid.uuid4()), "facility_id": FACILITY_ID, "content": ""})


@router.put("", response_model=QaaNoteOut)
async def update_notes(body: QaaNoteUpdate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qaa_notes", {"facility_id": f"eq.{FACILITY_ID}"})
    now = datetime.now(timezone.utc).isoformat()
    if rows:
        return await db.update("qaa_notes", {"facility_id": FACILITY_ID}, {"content": body.content, "updated_at": now})
    return await db.insert("qaa_notes", {"id": str(uuid.uuid4()), "facility_id": FACILITY_ID, "content": body.content})
