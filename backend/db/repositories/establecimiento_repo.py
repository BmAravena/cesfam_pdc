from sqlalchemy import select

from backend.db.models.establecimiento import Establecimiento
from backend.db.repositories.base import BaseRepository


class EstablecimientoRepository(BaseRepository[Establecimiento]):
    model = Establecimiento

    async def get_by_nombre(self, nombre_centro: str) -> Establecimiento | None:
        query = select(Establecimiento).where(
            Establecimiento.nombre_centro == nombre_centro
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_tipo(self, tipo_centro: str) -> list[Establecimiento]:
        query = select(Establecimiento).where(
            Establecimiento.tipo_centro == tipo_centro
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
