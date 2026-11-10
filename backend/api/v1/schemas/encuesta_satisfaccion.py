from datetime import datetime
from typing import Any

from pydantic import Field, model_validator

from backend.api.v1.schemas.common import ORMModel


class EncuestaSatisfaccionCreate(ORMModel):
    id_establecimiento: int = Field(gt=0)
    datos_documento: dict[str, Any]

    @model_validator(mode="after")
    def validar_documento(self) -> "EncuestaSatisfaccionCreate":
        if not self.datos_documento:
            raise ValueError("datos_documento no puede estar vacío")
        return self


class EncuestaSatisfaccionResponse(ORMModel):
    id_encuesta: int
    id_establecimiento: int
    fecha_respuesta: datetime | None
    datos_documento: dict[str, Any]


class EncuestaReporteItem(ORMModel):
    """Métricas agregadas de satisfacción por establecimiento.

    Los promedios son None cuando ninguna respuesta incluyó la clave
    correspondiente como valor numérico en `datos_documento`.
    """

    id_establecimiento: int
    total_respuestas: int
    promedio_trato: float | None = None
    promedio_tiempo_espera: float | None = None
    promedio_calidad: float | None = None
