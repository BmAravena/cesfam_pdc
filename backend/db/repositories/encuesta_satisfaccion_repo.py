from datetime import date
from typing import Any

from sqlalchemy import select, text

from backend.core.encuestas import (
    CLAVES_LEGACY,
    DIMENSIONES_ENCUESTA,
    ESCALA_MAX,
    ESCALA_MIN,
)
from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.repositories.base import BaseRepository


def _lista_sql(valores: tuple[str, ...]) -> str:
    """Lista de literales SQL para constantes controladas por el servidor."""
    return ", ".join(f"'{valor}'" for valor in valores)


class EncuestaSatisfaccionRepository(BaseRepository[EncuestaSatisfaccion]):
    model = EncuestaSatisfaccion

    @staticmethod
    def _expresion_dimension(dimension: str) -> str:
        legacy = CLAVES_LEGACY.get(dimension)
        actual = f"datos_documento->>'{dimension}'"
        if legacy is None:
            return actual
        return f"COALESCE({actual}, datos_documento->>'{legacy}')"

    @staticmethod
    def _filtros(
        id_establecimiento: int | None,
        desde: date | None,
        hasta: date | None,
    ) -> tuple[str, dict[str, Any]]:
        condiciones = ["TRUE"]
        parametros: dict[str, Any] = {}

        if id_establecimiento is not None:
            condiciones.append("id_establecimiento = :id_establecimiento")
            parametros["id_establecimiento"] = id_establecimiento
        if desde is not None:
            condiciones.append("fecha_respuesta >= CAST(:desde AS date)")
            parametros["desde"] = desde
        if hasta is not None:
            condiciones.append(
                "fecha_respuesta < CAST(:hasta AS date) + INTERVAL '1 day'"
            )
            parametros["hasta"] = hasta

        return " AND ".join(condiciones), parametros

    async def resumen_por_establecimiento(
        self,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> list[dict[str, Any]]:
        columnas = ["id_establecimiento", "count(*)::int AS total_respuestas"]
        for dimension in DIMENSIONES_ENCUESTA:
            expresion = self._expresion_dimension(dimension)
            columnas.append(
                f"avg(({expresion})::numeric) FILTER "
                f"(WHERE ({expresion}) ~ '^[{ESCALA_MIN}-{ESCALA_MAX}]$') "
                f'AS "promedio_{dimension}"'
            )

        where, parametros = self._filtros(id_establecimiento, desde, hasta)
        consulta = text(
            f"""
            SELECT {", ".join(columnas)}
            FROM encuesta_satisfaccion
            WHERE {where}
            GROUP BY id_establecimiento
            ORDER BY id_establecimiento
            """
        )

        resultado = await self.db.execute(consulta, parametros)
        filas: list[dict[str, Any]] = []
        for fila in resultado.mappings().all():
            item = dict(fila)
            for dimension in DIMENSIONES_ENCUESTA:
                clave = f"promedio_{dimension}"
                item[clave] = (
                    float(item[clave]) if item[clave] is not None else None
                )
            filas.append(item)
        return filas

    async def distribucion_por_establecimiento(
        self,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> list[dict[str, Any]]:
        where, parametros = self._filtros(id_establecimiento, desde, hasta)

        # Para datos históricos se aceptan las claves antiguas, pero solo si
        # la respuesta no trae ya la clave nueva (evita doble conteo).
        claves_nuevas = _lista_sql(DIMENSIONES_ENCUESTA)
        condiciones_legacy = []
        for dimension, legacy in CLAVES_LEGACY.items():
            condiciones_legacy.append(
                f"(e.key = '{legacy}' AND NOT (datos_documento ? '{dimension}'))"
            )
        condicion_claves = f"e.key IN ({claves_nuevas})"
        if condiciones_legacy:
            condicion_claves = (
                f"({condicion_claves} OR " + " OR ".join(condiciones_legacy) + ")"
            )

        consulta = text(
            f"""
            SELECT
                id_establecimiento,
                CASE e.key
                    WHEN 'calidad' THEN 'calidad_atencion'
                    WHEN 'trato' THEN 'trato_personal'
                    ELSE e.key
                END AS dimension,
                e.value::int AS valor,
                count(*)::int AS cantidad
            FROM encuesta_satisfaccion
            CROSS JOIN LATERAL jsonb_each_text(datos_documento) AS e(key, value)
            WHERE {where}
              AND {condicion_claves}
              AND e.value ~ '^[{ESCALA_MIN}-{ESCALA_MAX}]$'
            GROUP BY id_establecimiento, dimension, valor
            ORDER BY id_establecimiento, dimension, valor
            """
        )

        resultado = await self.db.execute(consulta, parametros)
        return [dict(fila) for fila in resultado.mappings().all()]

    async def comentarios(
        self,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        limite: int = 200,
    ) -> list[dict[str, Any]]:
        where, parametros = self._filtros(id_establecimiento, desde, hasta)
        parametros["limite"] = limite

        consulta = text(
            f"""
            SELECT
                id_establecimiento,
                fecha_respuesta,
                btrim(datos_documento->>'comentario') AS comentario
            FROM encuesta_satisfaccion
            WHERE {where}
              AND datos_documento ? 'comentario'
              AND btrim(datos_documento->>'comentario') <> ''
            ORDER BY fecha_respuesta DESC
            LIMIT :limite
            """
        )

        resultado = await self.db.execute(consulta, parametros)
        return [dict(fila) for fila in resultado.mappings().all()]

    async def listar_respuestas(
        self,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        limite: int = 10_000,
    ) -> list[dict[str, Any]]:
        where, parametros = self._filtros(id_establecimiento, desde, hasta)
        parametros["limite"] = limite

        consulta = text(
            f"""
            SELECT id_establecimiento, fecha_respuesta, datos_documento
            FROM encuesta_satisfaccion
            WHERE {where}
            ORDER BY fecha_respuesta DESC
            LIMIT :limite
            """
        )

        resultado = await self.db.execute(consulta, parametros)
        return [dict(fila) for fila in resultado.mappings().all()]

    async def get_by_establecimiento(
        self, id_establecimiento: int, skip: int = 0, limit: int = 100
    ) -> list[EncuestaSatisfaccion]:
        query = (
            select(EncuestaSatisfaccion)
            .where(EncuestaSatisfaccion.id_establecimiento == id_establecimiento)
            .order_by(EncuestaSatisfaccion.fecha_respuesta.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
