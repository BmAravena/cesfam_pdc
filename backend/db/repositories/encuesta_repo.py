from sqlalchemy import select

from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.repositories.base import BaseRepository


class EncuestaSatisfaccionRepository(BaseRepository[EncuestaSatisfaccion]):
    model = EncuestaSatisfaccion

    async def get_by_id(self, encuesta_id: int) -> EncuestaSatisfaccion | None:
        query = select(EncuestaSatisfaccion).where(EncuestaSatisfaccion.id == encuesta_id)
        result = await self.db.execute(query)
        return result.scalars().first()
