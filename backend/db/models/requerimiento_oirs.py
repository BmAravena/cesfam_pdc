from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.establecimiento import Establecimiento

ESTADOS_REQUERIMIENTO = (
    "Ingresado",
    "En Proceso",
    "Respondido",
    "Cerrado",
    "Rechazado",
)


class RequerimientoOirs(Base):
    """Solicitud ciudadana con plazo legal de 15 días hábiles (Ley N° 20.584)."""

    __tablename__ = "requerimiento_oirs"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Ingresado', 'En Proceso', 'Respondido', 'Cerrado', 'Rechazado')",
            name="ck_requerimiento_oirs_estado",
        ),
    )

    id_requerimiento: Mapped[int] = mapped_column(primary_key=True)
    codigo_seguimiento: Mapped[str] = mapped_column(String(20), unique=True)
    tipo_solicitud: Mapped[str] = mapped_column(String(30))
    detalle_solicitud: Mapped[str] = mapped_column(Text)
    estado: Mapped[str | None] = mapped_column(
        String(30),
        default="Ingresado",
        server_default=text("'Ingresado'"),
    )
    fecha_ingreso: Mapped[date | None] = mapped_column(
        Date,
        server_default=func.current_date(),
    )
    fecha_limite: Mapped[date] = mapped_column(Date)
    es_anonimo: Mapped[bool] = mapped_column(
        default=False,
        server_default=text("false"),
    )
    id_establecimiento: Mapped[int] = mapped_column(
        ForeignKey("establecimiento.id_establecimiento")
    )

    establecimiento: Mapped["Establecimiento"] = relationship(
        back_populates="requerimientos",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<RequerimientoOirs id={self.id_requerimiento} codigo={self.codigo_seguimiento!r}>"
