from sqlalchemy import String, Integer, Date, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid, datetime
from app.db.session import Base


class Qapi(Base):
    __tablename__ = "qapis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[str] = mapped_column(server_default=func.now())
    issues_identified: Mapped[str | None] = mapped_column(String, nullable=True)
    date_identified: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    items: Mapped[list["QapiItem"]] = relationship("QapiItem", back_populates="qapi", order_by="QapiItem.order")


class QapiItem(Base):
    __tablename__ = "qapi_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qapi_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("qapis.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(server_default=func.now())
    root_cause: Mapped[str | None] = mapped_column(String, nullable=True)
    systemic_change: Mapped[str | None] = mapped_column(String, nullable=True)
    monitoring_type: Mapped[str | None] = mapped_column(String, nullable=True)
    monitoring_cadence: Mapped[str | None] = mapped_column(String, nullable=True)
    monitoring_role: Mapped[str | None] = mapped_column(String, nullable=True)
    responsible_person: Mapped[str | None] = mapped_column(String, nullable=True)
    start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    expected_completion_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    qapi: Mapped["Qapi"] = relationship("Qapi", back_populates="items")
