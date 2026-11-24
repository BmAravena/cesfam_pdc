from datetime import date, datetime
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


class RequerimientoOirsCreatePublico(RequerimientoOirsBase):
    """Payload del endpoint público: no permite fijar estado, código ni fechas."""


class RequerimientoOirsEstadoUpdate(ORMModel):
    estado: EstadoRequerimiento


class RequerimientoOirsResponder(ORMModel):
    respuesta: str = Field(min_length=1, max_length=5000)


class RequerimientoOirsUpdate(ORMModel):
    tipo_solicitud: str | None = Field(default=None, min_length=1, max_length=30)
    detalle_solicitud: str | None = Field(default=None, min_length=1)
    estado: EstadoRequerimiento | None = None
    fecha_limite: date | None = None
    es_anonimo: bool | None = None
    id_establecimiento: int | None = Field(default=None, gt=0)


class RequerimientoOirsListItem(ORMModel):
    """Fila de bandeja: solo las columnas que muestra la tabla.

    No incluye `detalle_solicitud` ni `respuesta` (texto libre y potencialmente
    largo); esos campos se piden aparte con GET /requerimientos/{id}.
    """

    id_requerimiento: int
    codigo_seguimiento: str
    tipo_solicitud: str
    estado: EstadoRequerimiento
    fecha_ingreso: date
    fecha_limite: date
    id_establecimiento: int
    nombre_centro: str


class RequerimientoOirsResponse(RequerimientoOirsBase):
    id_requerimiento: int
    codigo_seguimiento: str
    estado: EstadoRequerimiento
    respuesta: str | None = None
    fecha_respuesta: datetime | None = None
    fecha_ingreso: date
    fecha_limite: date


class RequerimientoOirsPublicoResponse(ORMModel):
    """Consulta pública por código: nunca expone detalle_solicitud.

    El detalle puede contener datos personales que el ciudadano escribió
    de forma voluntaria (nombre, RUT, email).
    """

    codigo_seguimiento: str
    tipo_solicitud: str
    estado: EstadoRequerimiento
    respuesta: str | None = None
    fecha_respuesta: datetime | None = None
    fecha_ingreso: date
    fecha_limite: date


class RequerimientoResumen(ORMModel):
    """Totales del panel de control, ya filtrados por el alcance del rol."""

    total: int
    abiertos: int
    respondidos: int
    vencidos: int
    tasa_cumplimiento: float


class RequerimientoEstadisticaItem(ORMModel):
    """Métricas agregadas por establecimiento.

    `vencidos` incluye solo requerimientos abiertos con fecha_limite pasada.
    `tasa_cumplimiento` es el porcentaje de requerimientos no vencidos.
    """

    id_establecimiento: int
    nombre_centro: str
    total: int
    ingresados: int
    en_proceso: int
    respondidos: int
    cerrados: int
    rechazados: int
    vencidos: int
    tasa_cumplimiento: float


class ReclamoEstablecimientoItem(ORMModel):
    """Conteo de reclamos de un establecimiento (puede ser 0)."""

    id_establecimiento: int
    nombre_centro: str
    total_reclamos: int


class ReclamosResumen(ORMModel):
    """Total de reclamos y desglose por centro según el alcance del rol."""

    total_reclamos: int
    por_establecimiento: list[ReclamoEstablecimientoItem]
