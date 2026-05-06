from sqlalchemy import Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.session import Base


class Angel(Base):
    __tablename__ = "angels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    department_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    absent: Mapped[bool] = mapped_column(Boolean, default=False)
    absent_since: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    department: Mapped["Department"] = relationship("Department", foreign_keys=[department_id])
