import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.resident import ResidentOut, ResidentAssign

router = APIRouter(prefix="/residents", tags=["residents"])

FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


@router.get("", response_model=list[ResidentOut])
async def list_residents(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("residents", {
        "active": "eq.true",
        "order": "room.asc,bed.asc",
    })
    return rows


@router.patch("/{resident_id}/assign", response_model=ResidentOut)
async def assign_resident(resident_id: int, body: ResidentAssign, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("residents", {"id": f"eq.{resident_id}"})
    if not rows:
        raise HTTPException(404, "Resident not found")
    data = {"primary_angel_id": str(body.primary_angel_id) if body.primary_angel_id else None}
    return await db.update("residents", {"id": str(resident_id)}, data)


@router.post("/auto-assign", status_code=200)
async def auto_assign(client: httpx.AsyncClient = Depends(get_db)):
    """Assign all active residents to angels sequentially by room (same room → same angel)."""
    db = DB(client)

    angels = await db.select("users", {
        "is_angel": "eq.true",
        "active": "eq.true",
        "order": "full_name.asc",
    })
    if not angels:
        raise HTTPException(400, "No active angels available")

    residents = await db.select("residents", {
        "active": "eq.true",
        "order": "room.asc,bed.asc",
    })

    room_to_angel: dict[int, str] = {}
    angel_idx = 0
    for resident in residents:
        room = resident["room"]
        if room not in room_to_angel:
            room_to_angel[room] = angels[angel_idx % len(angels)]["id"]
            angel_idx += 1
        await db.update("residents", {"id": str(resident["id"])}, {"primary_angel_id": room_to_angel[room]})

    return {"assigned": len(residents), "angels": len(angels)}


@router.get("/sync-pcc", status_code=200)
async def sync_pcc():
    """Mock PCC sync."""
    return {
        "source": "PointClickCare",
        "status": "connected",
        "last_sync": "2026-05-06T09:00:00Z",
        "residents_synced": 48,
    }
