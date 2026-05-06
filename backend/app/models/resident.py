from sqlalchemy import String, Boolean, Integer, Date, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid, datetime
from app.db.session import Base


class Resident(Base):
    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    npi: Mapped[str | None] = mapped_column(String, nullable=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    room: Mapped[int] = mapped_column(Integer, nullable=False)
    bed: Mapped[str] = mapped_column(String, nullable=False)
    current_resident: Mapped[bool | None] = mapped_column(Boolean, default=True, nullable=True)
    facility_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True)
    pcc_id: Mapped[str | None] = mapped_column(String, nullable=True)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    admitted_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    discharged_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())
    primary_angel_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
