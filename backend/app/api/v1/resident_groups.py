"""Resident grouping (wings, carts, custom) CRUD + membership management."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.resident_group import (
    ResidentGroupOut,
    ResidentGroupCreate,
    ResidentGroupUpdate,
    ResidentGroupMembershipUpdate,
)

router = APIRouter(prefix="/resident-groups", tags=["resident-groups"])


async def _with_members(group: dict, db: DB) -> dict:
    members = await db.select("resident_group_memberships", {"group_id": f"eq.{group['id']}"})
    return {**group, "member_ids": [m["resident_id"] for m in members]}


@router.get("", response_model=list[ResidentGroupOut])
async def list_groups(
    type: str | None = None,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    params: dict = {"order": "type.asc,name.asc"}
    if type:
        params["type"] = f"eq.{type}"
    groups = await db.select("resident_groups", params)
    return [await _with_members(g, db) for g in groups]


@router.post("", response_model=ResidentGroupOut, status_code=201)
async def create_group(body: ResidentGroupCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    g = await db.insert("resident_groups", {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "type": body.type,
        "facility_id": str(body.facility_id) if body.facility_id else None,
    })
    return {**g, "member_ids": []}


@router.patch("/{group_id}", response_model=ResidentGroupOut)
async def update_group(
    group_id: uuid.UUID,
    body: ResidentGroupUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("resident_groups", {"id": f"eq.{group_id}"})
    if not rows:
        raise HTTPException(404, "Group not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    g = await db.update("resident_groups", {"id": str(group_id)}, data) if data else rows[0]
    return await _with_members(g, db)


@router.delete("/{group_id}", status_code=204)
async def delete_group(group_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("resident_groups", {"id": f"eq.{group_id}"})
    if not rows:
        raise HTTPException(404, "Group not found")
    await db.delete("resident_groups", {"id": str(group_id)})  # memberships cascade


@router.put("/{group_id}/members", response_model=ResidentGroupOut)
async def set_members(
    group_id: uuid.UUID,
    body: ResidentGroupMembershipUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    """Replace the full membership list for a group."""
    db = DB(client)
    rows = await db.select("resident_groups", {"id": f"eq.{group_id}"})
    if not rows:
        raise HTTPException(404, "Group not found")
    # Wipe + re-add
    await db.delete("resident_group_memberships", {"group_id": str(group_id)})
    for rid in body.resident_ids:
        await db.insert("resident_group_memberships", {
            "resident_id": str(rid),
            "group_id": str(group_id),
        })
    return await _with_members(rows[0], db)
