from sqlalchemy import select

from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.repositories.base import BaseRepository


class EncuestaSatisfaccionRepository(BaseRepository[EncuestaSatisfaccion]):
    model = EncuestaSatisfaccion

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
