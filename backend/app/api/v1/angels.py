import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.angel import AngelOut, AngelCreate, AngelAbsent

router = APIRouter(prefix="/angels", tags=["angels"])


async def _build_angel_out(angel: dict, db: DB) -> dict:
    """Enrich an angel row with joined user/department names + resident count."""
    user_rows = await db.select("users", {"id": f"eq.{angel['user_id']}"})
    user = user_rows[0] if user_rows else {}

    dept_name = None
    if angel.get("department_id"):
        dept_rows = await db.select("departments", {"id": f"eq.{angel['department_id']}"})
        if dept_rows:
            dept_name = dept_rows[0]["name"]

    residents = await db.select("residents", {
        "angel_id": f"eq.{angel['id']}",
        "status": "eq.active",
    })

    return {
        **angel,
        "name": user.get("name", ""),
        "department": dept_name,
        "resident_count": len(residents),
    }


@router.get("", response_model=list[AngelOut])
async def list_angels(client: httpx.AsyncClient = Depends(get_db)):
    """List all angels with enriched user/department/resident-count fields.

    Batched: O(3) round-trips total regardless of angel count, vs. the
    O(3 × N) the per-row _build_angel_out helper would do.
    """
    db = DB(client)
    angels = await db.select("angels", {"order": "created_at.asc"})
    if not angels:
        return []

    user_ids = list({a["user_id"] for a in angels})
    dept_ids = list({a["department_id"] for a in angels if a.get("department_id")})
    angel_ids = [a["id"] for a in angels]

    users_by_id: dict[str, dict] = {}
    if user_ids:
        users_by_id = {
            u["id"]: u
            for u in await db.select("users", {
                "id": f"in.({','.join(user_ids)})",
                "select": "id,name",
            })
        }

    depts_by_id: dict[str, dict] = {}
    if dept_ids:
        depts_by_id = {
            d["id"]: d
            for d in await db.select("departments", {
                "id": f"in.({','.join(dept_ids)})",
                "select": "id,name",
            })
        }

    resident_counts: dict[str, int] = {}
    if angel_ids:
        for r in await db.select("residents", {
            "angel_id": f"in.({','.join(angel_ids)})",
            "status": "eq.active",
            "select": "angel_id",
        }):
            resident_counts[r["angel_id"]] = resident_counts.get(r["angel_id"], 0) + 1

    return [
        {
            **a,
            "name": users_by_id.get(a["user_id"], {}).get("name", ""),
            "department": depts_by_id.get(a.get("department_id") or "", {}).get("name"),
            "resident_count": resident_counts.get(a["id"], 0),
        }
        for a in angels
    ]


@router.post("", response_model=AngelOut, status_code=201)
async def create_angel(body: AngelCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {
        "id": str(uuid.uuid4()),
        "user_id": str(body.user_id),
        "department_id": str(body.department_id) if body.department_id else None,
        "absent": False,
    }
    angel = await db.insert("angels", data)
    return await _build_angel_out(angel, db)


@router.patch("/{angel_id}/absent", response_model=AngelOut)
async def set_absent(
    angel_id: uuid.UUID,
    body: AngelAbsent,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("angels", {"id": f"eq.{angel_id}"})
    if not rows:
        raise HTTPException(404, "Angel not found")

    update_data: dict = {
        "absent": body.absent,
        "absent_since": datetime.now(timezone.utc).isoformat() if body.absent else None,
    }
    angel = await db.update("angels", {"id": str(angel_id)}, update_data)

    if body.absent:
        # Unassign all residents from this angel, but remember where they came
        # from so that returning to duty can restore the assignment — even if
        # redistribution moves them to another angel in the meantime.
        residents = await db.select("residents", {"angel_id": f"eq.{angel_id}"})
        for r in residents:
            patch: dict = {"angel_id": None}
            # Don't overwrite an existing original_angel_id — that would happen
            # if a resident was redistributed onto a now-absent angel.
            if r.get("original_angel_id") is None:
                patch["original_angel_id"] = str(angel_id)
            await db.update("residents", {"id": str(r["id"])}, patch)
    else:
        # Returning to duty: pull back every resident whose original angel was
        # this one, regardless of who they were redistributed to.
        to_restore = await db.select(
            "residents",
            {"original_angel_id": f"eq.{angel_id}", "status": "eq.active"},
        )
        for r in to_restore:
            await db.update(
                "residents",
                {"id": str(r["id"])},
                {"angel_id": str(angel_id), "original_angel_id": None},
            )

    return await _build_angel_out(angel, db)


@router.post("/{angel_id}/redistribute", status_code=200)
async def redistribute(angel_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    """Redistribute unassigned residents across the available (non-absent) angels."""
    db = DB(client)
    unassigned = await db.select("residents", {
        "angel_id": "is.null",
        "status": "eq.active",
        "order": "room.asc,bed.asc",
    })
    available = await db.select("angels", {"absent": "eq.false"})
    if not available:
        raise HTTPException(400, "No available angels for redistribution")

    room_to_angel: dict[str, str] = {}
    idx = 0
    for r in unassigned:
        room = r["room"]
        if room not in room_to_angel:
            room_to_angel[room] = available[idx % len(available)]["id"]
            idx += 1
        await db.update("residents", {"id": str(r["id"])}, {"angel_id": room_to_angel[room]})

    return {"redistributed": len(unassigned), "to_angels": len(available)}
