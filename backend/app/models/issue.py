from sqlalchemy import String, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.session import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[str] = mapped_column(String, nullable=False)
    round_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rounds.id"), nullable=True)
    resident_id: Mapped[str] = mapped_column(String, nullable=False)
    resident_name: Mapped[str] = mapped_column(String, nullable=False)
    room: Mapped[str | None] = mapped_column(String, nullable=True)
    angel_id: Mapped[str] = mapped_column(String, nullable=False)
    angel_name: Mapped[str] = mapped_column(String, nullable=False)
    issue: Mapped[str] = mapped_column(String, nullable=False)
    raised_at: Mapped[str] = mapped_column(server_default=func.now())
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_by: Mapped[str | None] = mapped_column(String, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_at: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())
    response_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    question_text: Mapped[str | None] = mapped_column(String, nullable=True)
    answer_display: Mapped[str | None] = mapped_column(String, nullable=True)
    issue_description: Mapped[str | None] = mapped_column(String, nullable=True)
    resident_room: Mapped[str | None] = mapped_column(String, nullable=True)
