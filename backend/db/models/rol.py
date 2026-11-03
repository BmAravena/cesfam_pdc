from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.usuario import Usuario


class Rol(Base):
    """Control de acceso basado en roles (RBAC)."""

    __tablename__ = "rol"

    id_rol: Mapped[int] = mapped_column(primary_key=True)
    nombre_rol: Mapped[str] = mapped_column(String(50), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(255))

    usuarios: Mapped[list["Usuario"]] = relationship(
        back_populates="rol",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Rol id={self.id_rol} nombre={self.nombre_rol!r}>"
