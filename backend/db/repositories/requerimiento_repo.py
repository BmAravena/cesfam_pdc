from sqlalchemy import select

from backend.db.models.requerimiento_oirs import RequerimientoOirs
from backend.db.repositories.base import BaseRepository


class RequerimientoOirsRepository(BaseRepository[RequerimientoOirs]):
    model = RequerimientoOirs

    async def get_by_nombre(self, nombre_requerimiento: str) -> RequerimientoOirs | None:
        query = select(RequerimientoOirs).where(RequerimientoOirs.nombre_requerimiento == nombre_requerimiento)
        result = await self.db.execute(query)
        return result.scalars().first()

   # async def get_by_codigo_seguimiento(self, codigo_seguimiento: str) -> RequerimientoOirs | None:
    #    query = select(RequerimientoOirs).where(RequerimientoOirs.codigo_seguimiento == codigo_seguimiento)
     #   result = await self.db.execute(query)
      #  return result.scalars().first() 