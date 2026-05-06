from sqlalchemy import String, Boolean, Integer, SmallInteger, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.session import Base


class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("facilities.id"))
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("templates.id"))
    resident_id: Mapped[str] = mapped_column(String, nullable=False)
    angel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    resident_name: Mapped[str] = mapped_column(String, nullable=False)
    resident_room: Mapped[str | None] = mapped_column(String, nullable=True)
    angel_name: Mapped[str] = mapped_column(String, nullable=False)
    template_name: Mapped[str] = mapped_column(String, nullable=False)
    scheduled_at: Mapped[str | None] = mapped_column(nullable=True)
    started_at: Mapped[str | None] = mapped_column(nullable=True)
    submitted_at: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    questions_total: Mapped[int] = mapped_column(Integer, default=0)
    questions_answered: Mapped[int] = mapped_column(Integer, default=0)
    flags_raised: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())

    responses: Mapped[list["RoundResponse"]] = relationship("RoundResponse", back_populates="round")


class RoundResponse(Base):
    __tablename__ = "round_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    round_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rounds.id"))
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("template_questions.id"))
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    question_type: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer)
    answer_yn: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answer_pain: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    answer_text: Mapped[str | None] = mapped_column(String, nullable=True)
    answer_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    answer_display: Mapped[str] = mapped_column(String, nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    answered_at: Mapped[str] = mapped_column(server_default=func.now())

    round: Mapped["Round"] = relationship("Round", back_populates="responses")
