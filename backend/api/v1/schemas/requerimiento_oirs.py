from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from backend.api.v1.schemas.common import ORMModel

EstadoRequerimiento = Literal[
    "Ingresado",
    "En Proceso",
    "Respondido",
    "Cerrado",
    "Rechazado",
]


class RequerimientoOirsBase(ORMModel):
    tipo_solicitud: str = Field(min_length=1, max_length=30)
    detalle_solicitud: str = Field(min_length=1)
    es_anonimo: bool = False
    id_establecimiento: int = Field(gt=0)


class RequerimientoOirsCreate(RequerimientoOirsBase):
    # El código y el plazo legal se calculan en el servicio.
    codigo_seguimiento: str | None = Field(default=None, max_length=20)
    estado: EstadoRequerimiento = "Ingresado"
    fecha_ingreso: date | None = None
    fecha_limite: date | None = None

    @model_validator(mode="after")
    def validar_fechas(self) -> "RequerimientoOirsCreate":
        if (
            self.fecha_ingreso is not None
            and self.fecha_limite is not None
            and self.fecha_limite < self.fecha_ingreso
        ):
            raise ValueError("fecha_limite no puede ser anterior a fecha_ingreso")
        return self


class RequerimientoOirsUpdate(ORMModel):
    tipo_solicitud: str | None = Field(default=None, min_length=1, max_length=30)
    detalle_solicitud: str | None = Field(default=None, min_length=1)
    estado: EstadoRequerimiento | None = None
    fecha_limite: date | None = None
    es_anonimo: bool | None = None
    id_establecimiento: int | None = Field(default=None, gt=0)


class RequerimientoOirsResponse(RequerimientoOirsBase):
    id_requerimiento: int
    codigo_seguimiento: str
    estado: EstadoRequerimiento
    fecha_ingreso: date | None
    fecha_limite: date
