"""Question repository CRUD."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.db.client import get_db, DB
from app.schemas.question import QuestionOut, QuestionCreate, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["questions"])


def _serialize_uuid(value) -> str | None:
    return str(value) if value else None


@router.get("", response_model=list[QuestionOut])
async def list_questions(
    in_repository: bool | None = None,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    params: dict = {"order": "section.asc,text.asc"}
    if in_repository is not None:
        params["in_repository"] = f"eq.{'true' if in_repository else 'false'}"
    return await db.select("questions", params)


@router.post("", response_model=QuestionOut, status_code=201)
async def create_question(body: QuestionCreate, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    return await db.insert("questions", {
        "id": str(uuid.uuid4()),
        "text": body.text,
        "section": body.section,
        "issue_on": body.issue_on,
        "notify_department_id": _serialize_uuid(body.notify_department_id),
        "department_id": _serialize_uuid(body.department_id),
        "type": body.type,
        "scale_min": body.scale_min,
        "scale_max": body.scale_max,
        "scale_threshold": body.scale_threshold,
        "scale_threshold_direction": body.scale_threshold_direction,
        "in_repository": body.in_repository,
    })


@router.patch("/{question_id}", response_model=QuestionOut)
async def update_question(
    question_id: uuid.UUID,
    body: QuestionUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("questions", {"id": f"eq.{question_id}"})
    if not rows:
        raise HTTPException(404, "Question not found")

    # PATCH semantics: include only fields the caller actually sent (`exclude_unset`),
    # which lets clients clear nullable fields like notify_department_id by sending
    # an explicit null. Skipping None blanket-wise would make those fields unclearable.
    data = body.model_dump(exclude_unset=True)
    for uuid_field in ("notify_department_id", "department_id"):
        if uuid_field in data and data[uuid_field] is not None:
            data[uuid_field] = str(data[uuid_field])
    return await db.update("questions", {"id": str(question_id)}, data) if data else rows[0]


@router.delete("/{question_id}", status_code=204)
async def delete_question(question_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("questions", {"id": f"eq.{question_id}"})
    if not rows:
        raise HTTPException(404, "Question not found")
    await db.delete("questions", {"id": str(question_id)})
