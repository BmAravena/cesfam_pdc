from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.auditoria_log import AuditoriaLog
    from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
    from backend.db.models.requerimiento_oirs import RequerimientoOirs
    from backend.db.models.usuario import Usuario


class Establecimiento(Base):
    """Centro de salud de la red municipal (CESFAM, CECOSF, etc.)."""

    __tablename__ = "establecimiento"

    id_establecimiento: Mapped[int] = mapped_column(primary_key=True)
    nombre_centro: Mapped[str] = mapped_column(String(120))
    tipo_centro: Mapped[str] = mapped_column(String(60))
    direccion: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Ninguna de estas colecciones se expone en las respuestas de la API.
    # Con selectin, cargar un establecimiento traía TODOS sus usuarios,
    # requerimientos, encuestas y logs, lo que dominaba la latencia.
    usuarios: Mapped[list["Usuario"]] = relationship(
        back_populates="establecimiento",
        lazy="raise",
    )
    requerimientos: Mapped[list["RequerimientoOirs"]] = relationship(
        back_populates="establecimiento",
        lazy="raise",
    )
    encuestas: Mapped[list["EncuestaSatisfaccion"]] = relationship(
        back_populates="establecimiento",
        lazy="raise",
    )
    auditorias: Mapped[list["AuditoriaLog"]] = relationship(
        back_populates="establecimiento",
        lazy="raise",
    )

    def __repr__(self) -> str:
        return f"<Establecimiento id={self.id_establecimiento} nombre={self.nombre_centro!r}>"
