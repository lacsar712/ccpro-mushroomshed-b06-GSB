from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SHADES = ("pale", "mottled", "dark")


class ColorNote(Base):
    __tablename__ = "color_notes"
    __table_args__ = (
        UniqueConstraint("room_id", "noted_at", name="uq_color_note_room_noted_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    shade: Mapped[str] = mapped_column(String(16), nullable=False)
    ratio_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    noted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    observer: Mapped[str] = mapped_column(String(64), nullable=False)

    room: Mapped["Room"] = relationship("Room", back_populates="color_notes")
