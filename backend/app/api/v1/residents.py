import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.resident import ResidentOut, ResidentCreate, ResidentAssign

router = APIRouter(prefix="/residents", tags=["residents"])

FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


@router.get("", response_model=list[ResidentOut])
async def list_residents(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    return await db.select("residents", {
        "status": "eq.active",
        "order": "room.asc,bed.asc",
    })


@router.post("", response_model=ResidentOut, status_code=201)
async def create_resident(body: ResidentCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "room": body.room,
        "bed": body.bed,
        "angel_id": str(body.angel_id) if body.angel_id else None,
        "status": "active",
        "pcc_id": body.pcc_id,
    }
    return await db.insert("residents", data)


@router.patch("/{resident_id}/assign", response_model=ResidentOut)
async def assign_resident(
    resident_id: uuid.UUID,
    body: ResidentAssign,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("residents", {"id": f"eq.{resident_id}"})
    if not rows:
        raise HTTPException(404, "Resident not found")
    return await db.update("residents", {"id": str(resident_id)}, {
        "angel_id": str(body.angel_id) if body.angel_id else None,
    })


@router.post("/auto-assign", status_code=200)
async def auto_assign(client: httpx.AsyncClient = Depends(get_db)):
    """Assign all active residents to angels sequentially by room (same room → same angel)."""
    db = DB(client)
    angels = await db.select("angels", {"absent": "eq.false", "order": "created_at.asc"})
    if not angels:
        raise HTTPException(400, "No available angels")
    residents = await db.select("residents", {
        "status": "eq.active",
        "order": "room.asc,bed.asc",
    })

    room_to_angel: dict[str, str] = {}
    angel_idx = 0
    for r in residents:
        room = r["room"]
        if room not in room_to_angel:
            room_to_angel[room] = angels[angel_idx % len(angels)]["id"]
            angel_idx += 1
        await db.update("residents", {"id": str(r["id"])}, {"angel_id": room_to_angel[room]})

    return {"assigned": len(residents), "angels": len(angels)}


@router.get("/sync-pcc", status_code=200)
async def sync_pcc():
    """Mock PCC sync."""
    return {
        "source": "PointClickCare",
        "status": "connected",
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "residents_synced": 20,
    }
