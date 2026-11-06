from sqlalchemy import select

from backend.db.models.rol import Rol
from backend.db.repositories.base import BaseRepository


class RolRepository(BaseRepository[Rol]):
    model = Rol

    async def get_by_nombre(self, nombre_rol: str) -> Rol | None:
        query = select(Rol).where(Rol.nombre_rol == nombre_rol)
        result = await self.db.execute(query)
        return result.scalars().first()
