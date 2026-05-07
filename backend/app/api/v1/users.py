import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.user import UserOut, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    return await db.select("users", {"order": "name.asc"})


@router.post("", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "role": body.role,
        "department_id": str(body.department_id) if body.department_id else None,
        "notification_prefs": body.notification_prefs,
        "active": True,
    }
    return await db.insert("users", data)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(user_id: uuid.UUID, body: UserUpdate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("users", {"id": f"eq.{user_id}"})
    if not rows:
        raise HTTPException(404, "User not found")
    data: dict = {k: v for k, v in body.model_dump().items() if v is not None}
    if "department_id" in data and data["department_id"]:
        data["department_id"] = str(data["department_id"])
    if not data:
        return rows[0]
    return await db.update("users", {"id": str(user_id)}, data)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("users", {"id": f"eq.{user_id}"})
    if not rows:
        raise HTTPException(404, "User not found")
    await db.delete("users", {"id": str(user_id)})
