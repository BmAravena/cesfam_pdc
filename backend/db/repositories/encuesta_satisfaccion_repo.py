from sqlalchemy import Numeric, cast, func, select

from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.repositories.base import BaseRepository


class EncuestaSatisfaccionRepository(BaseRepository[EncuestaSatisfaccion]):
    model = EncuestaSatisfaccion

    @staticmethod
    def _promedio_numerico(clave: str):
        """AVG de una clave JSONB, ignorando valores no numéricos."""
        valor = EncuestaSatisfaccion.datos_documento[clave]
        return func.avg(cast(valor.astext, Numeric)).filter(
            func.jsonb_typeof(valor) == "number"
        )

    async def reporte_por_establecimiento(
        self, id_establecimiento: int | None = None
    ) -> list[dict]:
        query = (
            select(
                EncuestaSatisfaccion.id_establecimiento,
                func.count().label("total_respuestas"),
                self._promedio_numerico("trato").label("promedio_trato"),
                self._promedio_numerico("tiempo_espera").label(
                    "promedio_tiempo_espera"
                ),
                self._promedio_numerico("calidad").label("promedio_calidad"),
            )
            .group_by(EncuestaSatisfaccion.id_establecimiento)
            .order_by(EncuestaSatisfaccion.id_establecimiento)
        )
        if id_establecimiento is not None:
            query = query.where(
                EncuestaSatisfaccion.id_establecimiento == id_establecimiento
            )

        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

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
