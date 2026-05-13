"""Per-meeting QAA committee notes — one row per meeting."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.db.client import get_db, DB
from app.schemas.qaa import (
    QaaMeetingNoteOut,
    QaaMeetingNoteCreate,
    QaaMeetingNoteUpdate,
)

router = APIRouter(prefix="/qaa-meeting-notes", tags=["qaa-meeting-notes"])
# Match the same demo facility used by the singleton qaa_notes route so
# both surfaces address the same building.
FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


@router.get("", response_model=list[QaaMeetingNoteOut])
async def list_notes(client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    return await db.select(
        "qaa_meeting_notes",
        {
            "facility_id": f"eq.{FACILITY_ID}",
            "order": "meeting_date.desc,created_at.desc",
        },
    )


@router.post("", response_model=QaaMeetingNoteOut, status_code=201)
async def create_note(
    body: QaaMeetingNoteCreate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    return await db.insert("qaa_meeting_notes", {
        "id": str(uuid.uuid4()),
        "facility_id": FACILITY_ID,
        "meeting_date": body.meeting_date.isoformat(),
        "title": body.title,
        "content": body.content,
    })


@router.patch("/{note_id}", response_model=QaaMeetingNoteOut)
async def update_note(
    note_id: uuid.UUID,
    body: QaaMeetingNoteUpdate,
    client: httpx.AsyncClient = Depends(get_db),
):
    db = DB(client)
    rows = await db.select("qaa_meeting_notes", {"id": f"eq.{note_id}"})
    if not rows:
        raise HTTPException(404, "Meeting note not found")
    # exclude_unset so callers can leave fields alone instead of overwriting
    # them with their schema defaults.
    data = body.model_dump(exclude_unset=True)
    if "meeting_date" in data and data["meeting_date"] is not None:
        data["meeting_date"] = data["meeting_date"].isoformat()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return await db.update("qaa_meeting_notes", {"id": str(note_id)}, data)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: uuid.UUID, client: httpx.AsyncClient = Depends(get_db)):
    db = DB(client)
    rows = await db.select("qaa_meeting_notes", {"id": f"eq.{note_id}"})
    if not rows:
        raise HTTPException(404, "Meeting note not found")
    await db.delete("qaa_meeting_notes", {"id": str(note_id)})
