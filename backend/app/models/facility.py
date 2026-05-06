from sqlalchemy import String, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.session import Base


class Facility(Base):
    __tablename__ = "facilities"

    npi: Mapped[str] = mapped_column(String, primary_key=True)
    facility_name: Mapped[str] = mapped_column(String, nullable=False)
    licensed_beds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now())
