from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.establecimiento import Establecimiento


class EncuestaSatisfaccion(Base):
    """Encuesta de satisfacción anónima (documental JSONB, Ley N° 19.628)."""

    __tablename__ = "encuesta_satisfaccion"
    __table_args__ = (
        CheckConstraint(
            "jsonb_typeof(datos_documento) = 'object'",
            name="ck_encuesta_datos_object",
        ),
        Index("idx_encuesta_establecimiento", "id_establecimiento"),
        Index("idx_gin_encuesta_datos", "datos_documento", postgresql_using="gin"),
    )

    id_encuesta: Mapped[int] = mapped_column(primary_key=True)
    id_establecimiento: Mapped[int] = mapped_column(
        ForeignKey("establecimiento.id_establecimiento", ondelete="RESTRICT")
    )
    fecha_respuesta: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    datos_documento: Mapped[dict[str, Any]] = mapped_column(JSONB)

    establecimiento: Mapped["Establecimiento"] = relationship(
        back_populates="encuestas",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EncuestaSatisfaccion id={self.id_encuesta}>"
