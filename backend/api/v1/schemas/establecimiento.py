from pydantic import Field

from backend.api.v1.schemas.common import ORMModel


class EstablecimientoBase(ORMModel):
    nombre_centro: str = Field(min_length=1, max_length=120)
    tipo_centro: str = Field(min_length=1, max_length=60)


class EstablecimientoCreate(EstablecimientoBase):
    pass


class EstablecimientoUpdate(ORMModel):
    nombre_centro: str | None = Field(default=None, min_length=1, max_length=120)
    tipo_centro: str | None = Field(default=None, min_length=1, max_length=60)


class EstablecimientoResponse(EstablecimientoBase):
    id_establecimiento: int
