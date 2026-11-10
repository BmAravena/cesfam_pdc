from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DDL, DateTime, ForeignKey, Index, String, event, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base

if TYPE_CHECKING:
    from backend.db.models.establecimiento import Establecimiento
    from backend.db.models.usuario import Usuario


class AuditoriaLog(Base):
    """Registro inalterable (append-only) de acciones de usuario.

    La DB impide UPDATE/DELETE mediante el trigger trg_auditoria_append_only.
    """

    __tablename__ = "auditoria_log"
    __table_args__ = (
        Index("idx_auditoria_usuario", "id_usuario"),
        Index("idx_auditoria_establecimiento", "id_establecimiento"),
        Index("idx_auditoria_timestamp", "timestamp"),
    )

    id_log: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    id_usuario: Mapped[int | None] = mapped_column(
        ForeignKey("usuario.id_usuario", ondelete="SET NULL")
    )
    id_establecimiento: Mapped[int | None] = mapped_column(
        ForeignKey("establecimiento.id_establecimiento", ondelete="SET NULL")
    )
    accion: Mapped[str] = mapped_column(String(150))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    ip_origen: Mapped[str | None] = mapped_column(INET)

    usuario: Mapped["Usuario | None"] = relationship(
        back_populates="auditorias",
        lazy="selectin",
    )
    establecimiento: Mapped["Establecimiento | None"] = relationship(
        back_populates="auditorias",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<AuditoriaLog id={self.id_log} accion={self.accion!r}>"


# Mantiene el mismo trigger append-only que backend/db/scripts/create.sql
# cuando las tablas se crean con Base.metadata.create_all (tests/desarrollo).
# Se separa en dos DDL porque asyncpg no acepta múltiples comandos por sentencia.
_FN_APPEND_ONLY_DDL = DDL(
    """
    CREATE OR REPLACE FUNCTION fn_auditoria_append_only() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'auditoria_log es append-only: no se permite DELETE';
        END IF;
        IF NEW.id_log = OLD.id_log
           AND NEW.accion = OLD.accion
           AND NEW.timestamp = OLD.timestamp
           AND NEW.ip_origen IS NOT DISTINCT FROM OLD.ip_origen
        THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'auditoria_log es append-only: no se permite UPDATE';
    END;
    $$;
    """
).execute_if(dialect="postgresql")

_TRG_APPEND_ONLY_DDL = DDL(
    """
    CREATE TRIGGER trg_auditoria_append_only
    BEFORE UPDATE OR DELETE ON auditoria_log
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_append_only();
    """
).execute_if(dialect="postgresql")

event.listen(AuditoriaLog.__table__, "after_create", _FN_APPEND_ONLY_DDL)
event.listen(AuditoriaLog.__table__, "after_create", _TRG_APPEND_ONLY_DDL)
