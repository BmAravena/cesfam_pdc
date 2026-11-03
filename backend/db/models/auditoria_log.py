from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.usuario import Usuario


class AuditoriaLog(Base):
    """Registro inalterable (append-only) de acciones de usuario."""

    __tablename__ = "auditoria_log"

    id_log: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    id_usuario: Mapped[int | None] = mapped_column(ForeignKey("usuario.id_usuario"))
    accion: Mapped[str] = mapped_column(String(150))
    timestamp: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    ip_origen: Mapped[str | None] = mapped_column(INET)

    usuario: Mapped["Usuario | None"] = relationship(
        back_populates="auditorias",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<AuditoriaLog id={self.id_log} accion={self.accion!r}>"
