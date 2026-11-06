from sqlalchemy import select

from backend.db.models.requerimiento_oirs import RequerimientoOirs
from backend.db.repositories.base import BaseRepository


class RequerimientoOirsRepository(BaseRepository[RequerimientoOirs]):
    model = RequerimientoOirs

    async def get_by_codigo(self, codigo: str) -> RequerimientoOirs | None:
        query = select(RequerimientoOirs).where(
            RequerimientoOirs.codigo_seguimiento == codigo
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_establecimiento(
        self, id_establecimiento: int, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        query = (
            select(RequerimientoOirs)
            .where(RequerimientoOirs.id_establecimiento == id_establecimiento)
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_estado(
        self, estado: str, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        query = (
            select(RequerimientoOirs)
            .where(RequerimientoOirs.estado == estado)
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
