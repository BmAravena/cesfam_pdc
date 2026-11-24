from datetime import datetime
from typing import Any

from pydantic import Field, model_validator
from pydantic_core import PydanticCustomError

from backend.api.v1.schemas.common import ORMModel
from backend.core.encuestas import (
    DIMENSIONES_ENCUESTA,
    ESCALA_MAX,
    ESCALA_MIN,
    MAX_COMENTARIO,
)


def _error(mensaje: str) -> PydanticCustomError:
    return PydanticCustomError("encuesta_invalida", mensaje)


ETIQUETAS_DIMENSION = {
    "calidad_atencion": "calidad de la atención",
    "tiempo_espera": "tiempo de espera",
    "trato_personal": "trato del personal",
    "presentacion_limpieza": "presentación y limpieza del personal",
    "claridad_indicaciones": "claridad de las indicaciones",
}


class EncuestaSatisfaccionCreate(ORMModel):
    """Encuesta anónima: solo establecimiento y respuestas por dimensión."""

    id_establecimiento: int = Field(gt=0)
    datos_documento: dict[str, Any]

    @model_validator(mode="after")
    def validar_documento(self) -> "EncuestaSatisfaccionCreate":
        datos = self.datos_documento

        if not isinstance(datos, dict) or not datos:
            raise _error("Las respuestas de la encuesta no pueden estar vacías")

        claves_permitidas = set(DIMENSIONES_ENCUESTA) | {"comentario"}
        desconocidas = sorted(set(datos) - claves_permitidas)
        if desconocidas:
            raise _error(
                "La encuesta contiene campos no reconocidos: "
                + ", ".join(desconocidas)
            )

        for dimension in DIMENSIONES_ENCUESTA:
            if dimension not in datos:
                raise _error(
                    "Falta responder: "
                    + ETIQUETAS_DIMENSION.get(dimension, dimension)
                )
            datos[dimension] = self._validar_escala(
                dimension,
                datos[dimension],
            )

        comentario = datos.get("comentario")
        if comentario is None:
            datos.pop("comentario", None)
        else:
            if not isinstance(comentario, str):
                raise _error("El comentario debe ser texto")
            comentario = comentario.strip()
            if len(comentario) > MAX_COMENTARIO:
                raise _error(
                    f"El comentario no puede superar los {MAX_COMENTARIO} caracteres"
                )
            if comentario:
                datos["comentario"] = comentario
            else:
                datos.pop("comentario")

        return self

    @staticmethod
    def _validar_escala(dimension: str, valor: Any) -> int:
        etiqueta = ETIQUETAS_DIMENSION.get(dimension, dimension)
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            raise _error(
                f"La dimensión «{etiqueta}» debe ser un número entre {ESCALA_MIN} y {ESCALA_MAX}"
            )
        if not float(valor).is_integer():
            raise _error(
                f"La dimensión «{etiqueta}» debe ser un número entero entre {ESCALA_MIN} y {ESCALA_MAX}"
            )
        numero = int(valor)
        if not ESCALA_MIN <= numero <= ESCALA_MAX:
            raise _error(
                f"La dimensión «{etiqueta}» debe estar entre {ESCALA_MIN} y {ESCALA_MAX}"
            )
        return numero


class EncuestaSatisfaccionResponse(ORMModel):
    id_encuesta: int
    id_establecimiento: int
    fecha_respuesta: datetime | None
    datos_documento: dict[str, Any]


class EncuestaComentarioItem(ORMModel):
    fecha_respuesta: datetime
    comentario: str


class EncuestaReporteItem(ORMModel):
    """Métricas agregadas de satisfacción por establecimiento.

    `promedios` y `distribucion` usan las claves de `DIMENSIONES_ENCUESTA`.
    Un promedio es None cuando ninguna respuesta incluyó esa dimensión como
    valor numérico válido.
    """

    id_establecimiento: int
    total_respuestas: int
    promedios: dict[str, float | None]
    distribucion: dict[str, dict[str, int]]
    comentarios: list[EncuestaComentarioItem]
