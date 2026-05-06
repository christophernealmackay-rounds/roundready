import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.qapi import QapiOut, QapiCreate, QapiUpdate, QapiItemOut, QapiItemCreate, QapiItemUpdate

router = APIRouter(prefix="/qapis", tags=["qapis"])


async def _with_items(qapi: dict, db: DB) -> dict:
    items = await db.select("qapi_items", {"qapi_id": f"eq.{qapi['id']}", "order": "order.asc"})
    return {**qapi, "items": items}


@router.get("", response_model=list[QapiOut])
async def list_qapis(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    qapis = await db.select("qapis", {"order": "created_at.desc"})
    return [await _with_items(q, db) for q in qapis]


@router.post("", response_model=QapiOut, status_code=201)
async def create_qapi(body: QapiCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    data = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "status": "active",
        "issues_identified": body.issues_identified,
        "date_identified": body.date_identified.isoformat() if body.date_identified else None,
    }
    qapi = await db.insert("qapis", data)
    return {**qapi, "items": []}


@router.patch("/{qapi_id}", response_model=QapiOut)
async def update_qapi(qapi_id: uuid.UUID, body: QapiUpdate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qapis", {"id": f"eq.{qapi_id}"})
    if not rows:
        raise HTTPException(404, "QAPI not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if data.get("date_identified"):
        data["date_identified"] = data["date_identified"].isoformat()
    qapi = await db.update("qapis", {"id": str(qapi_id)}, data) if data else rows[0]
    return await _with_items(qapi, db)


@router.delete("/{qapi_id}", status_code=204)
async def delete_qapi(qapi_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qapis", {"id": f"eq.{qapi_id}"})
    if not rows:
        raise HTTPException(404, "QAPI not found")
    await db.delete("qapi_items", {"qapi_id": str(qapi_id)})
    await db.delete("qapis", {"id": str(qapi_id)})


@router.post("/{qapi_id}/items", response_model=QapiItemOut, status_code=201)
async def create_item(qapi_id: uuid.UUID, body: QapiItemCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qapis", {"id": f"eq.{qapi_id}"})
    if not rows:
        raise HTTPException(404, "QAPI not found")
    data = {"id": str(uuid.uuid4()), "qapi_id": str(qapi_id), **body.model_dump()}
    if data.get("start_date"):
        data["start_date"] = data["start_date"].isoformat()
    if data.get("expected_completion_date"):
        data["expected_completion_date"] = data["expected_completion_date"].isoformat()
    return await db.insert("qapi_items", data)


@router.patch("/{qapi_id}/items/{item_id}", response_model=QapiItemOut)
async def update_item(qapi_id: uuid.UUID, item_id: uuid.UUID, body: QapiItemUpdate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qapi_items", {"id": f"eq.{item_id}", "qapi_id": f"eq.{qapi_id}"})
    if not rows:
        raise HTTPException(404, "Item not found")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if data.get("start_date"):
        data["start_date"] = data["start_date"].isoformat()
    if data.get("expected_completion_date"):
        data["expected_completion_date"] = data["expected_completion_date"].isoformat()
    return await db.update("qapi_items", {"id": str(item_id)}, data) if data else rows[0]


@router.delete("/{qapi_id}/items/{item_id}", status_code=204)
async def delete_item(qapi_id: uuid.UUID, item_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qapi_items", {"id": f"eq.{item_id}", "qapi_id": f"eq.{qapi_id}"})
    if not rows:
        raise HTTPException(404, "Item not found")
    await db.delete("qapi_items", {"id": str(item_id)})
