import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.department import DepartmentOut, DepartmentCreate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
async def list_departments(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("departments", {"order": "name.asc"})
    return rows


@router.post("", response_model=DepartmentOut, status_code=201)
async def create_department(body: DepartmentCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {"id": str(uuid.uuid4()), "name": body.name, "custom": body.custom}
    if body.facility_id:
        data["facility_id"] = str(body.facility_id)
    return await db.insert("departments", data)


@router.delete("/{dept_id}", status_code=204)
async def delete_department(dept_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("departments", {"id": f"eq.{dept_id}"})
    if not rows:
        raise HTTPException(404, "Department not found")
    await db.delete("departments", {"id": str(dept_id)})
