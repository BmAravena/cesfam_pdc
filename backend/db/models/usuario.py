from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.auditoria_log import AuditoriaLog
    from backend.db.models.establecimiento import Establecimiento
    from backend.db.models.rol import Rol


class Usuario(Base):
    """Personal administrativo y de salud."""

    __tablename__ = "usuario"
    __table_args__ = (
        Index("idx_usuario_rol", "id_rol"),
        Index("idx_usuario_establecimiento", "id_establecimiento"),
    )

    id_usuario: Mapped[int] = mapped_column(primary_key=True)
    rut: Mapped[str] = mapped_column(String(12), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(120), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    id_rol: Mapped[int] = mapped_column(ForeignKey("rol.id_rol"))
    id_establecimiento: Mapped[int] = mapped_column(
        ForeignKey("establecimiento.id_establecimiento")
    )
    # Borrado lógico: los usuarios dados de baja se conservan para no perder
    # la trazabilidad de auditoria_log ni liberar RUT/email.
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
    )
    fecha_baja: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rol: Mapped["Rol"] = relationship(back_populates="usuarios", lazy="selectin")
    establecimiento: Mapped["Establecimiento"] = relationship(
        back_populates="usuarios",
        lazy="selectin",
    )
    auditorias: Mapped[list["AuditoriaLog"]] = relationship(
        back_populates="usuario",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Usuario id={self.id_usuario} rut={self.rut!r}>"
