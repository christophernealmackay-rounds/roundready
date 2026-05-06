import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.angel import AngelOut, AngelCreate, AngelAbsent

router = APIRouter(prefix="/angels", tags=["angels"])
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _build_angel_out(angel: dict, db: DB) -> dict:
    user_rows = await db.select("users", {"id": f"eq.{angel['user_id']}"})
    user = user_rows[0] if user_rows else {}

    dept_name = user.get("department", "")
    if angel.get("department_id"):
        dept_rows = await db.select("departments", {"id": f"eq.{angel['department_id']}"})
        if dept_rows:
            dept_name = dept_rows[0]["name"]

    # Count residents assigned to this angel (via users.id = residents.primary_angel_id)
    residents = await db.select("residents", {
        "primary_angel_id": f"eq.{angel['user_id']}",
        "active": "eq.true",
    })

    # Count completed rounds today
    rounds_today = await db.select("rounds", {
        "angel_id": f"eq.{angel['user_id']}",
        "status": "eq.completed",
        "submitted_at": f"gte.{TODAY}T00:00:00Z",
    })

    return {
        **angel,
        "full_name": user.get("full_name", ""),
        "email": user.get("email"),
        "department": dept_name,
        "resident_count": len(residents),
        "rounds_today": len(rounds_today),
    }


@router.get("", response_model=list[AngelOut])
async def list_angels(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    angels = await db.select("angels", {"order": "created_at.asc"})
    return [await _build_angel_out(a, db) for a in angels]


@router.post("", response_model=AngelOut, status_code=201)
async def create_angel(body: AngelCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {"id": str(uuid.uuid4()), "user_id": str(body.user_id), "absent": False}
    if body.department_id:
        data["department_id"] = str(body.department_id)
    angel = await db.insert("angels", data)
    return await _build_angel_out(angel, db)


@router.patch("/{angel_id}/absent", response_model=AngelOut)
async def set_absent(angel_id: uuid.UUID, body: AngelAbsent, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("angels", {"id": f"eq.{angel_id}"})
    if not rows:
        raise HTTPException(404, "Angel not found")
    angel = rows[0]

    update_data: dict = {
        "absent": body.absent,
        "absent_since": datetime.now(timezone.utc).isoformat() if body.absent else None,
    }
    angel = await db.update("angels", {"id": str(angel_id)}, update_data)

    if body.absent:
        # Unassign all residents from this angel
        residents = await db.select("residents", {"primary_angel_id": f"eq.{angel['user_id']}"})
        for r in residents:
            await db.update("residents", {"id": str(r["id"])}, {"primary_angel_id": None})

    return await _build_angel_out(angel, db)


@router.post("/{angel_id}/redistribute", status_code=200)
async def redistribute(angel_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    unassigned = await db.select("residents", {
        "primary_angel_id": "is.null",
        "active": "eq.true",
        "order": "room.asc,bed.asc",
    })

    available_angels = await db.select("angels", {"absent": "eq.false"})
    if not available_angels:
        raise HTTPException(400, "No available angels for redistribution")

    room_to_angel: dict[int, str] = {}
    angel_idx = 0
    for resident in unassigned:
        room = resident["room"]
        if room not in room_to_angel:
            room_to_angel[room] = available_angels[angel_idx % len(available_angels)]["user_id"]
            angel_idx += 1
        await db.update("residents", {"id": str(resident["id"])}, {"primary_angel_id": room_to_angel[room]})

    return {"redistributed": len(unassigned), "to_angels": len(available_angels)}
