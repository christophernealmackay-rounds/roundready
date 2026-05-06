from sqlalchemy import String, Boolean, Integer, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.session import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("facilities.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    frequency: Mapped[str] = mapped_column(String, default="Once daily")
    assigned_role: Mapped[str] = mapped_column(String, default="All angels")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    archived_at: Mapped[str | None] = mapped_column(nullable=True)
    started_at: Mapped[str] = mapped_column(server_default=func.now())
    created_at: Mapped[str] = mapped_column(server_default=func.now())

    questions: Mapped[list["TemplateQuestion"]] = relationship("TemplateQuestion", back_populates="template", order_by="TemplateQuestion.position")


class TemplateQuestion(Base):
    __tablename__ = "template_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("templates.id"))
    position: Mapped[int] = mapped_column(Integer)
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    question_type: Mapped[str] = mapped_column(String, nullable=False)
    flags_on: Mapped[str | None] = mapped_column(String, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())

    template: Mapped["Template"] = relationship("Template", back_populates="questions")
