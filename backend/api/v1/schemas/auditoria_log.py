from datetime import datetime

from pydantic import Field, IPvAnyAddress

from backend.api.v1.schemas.common import ORMModel


class AuditoriaLogCreate(ORMModel):
    id_usuario: int | None = Field(default=None, gt=0)
    accion: str = Field(min_length=1, max_length=150)
    ip_origen: IPvAnyAddress | None = None


class AuditoriaLogResponse(ORMModel):
    """El log es append-only: no existe schema de actualización."""

    id_log: int
    id_usuario: int | None
    accion: str
    timestamp: datetime | None
    ip_origen: IPvAnyAddress | None
