from sqlalchemy import exists, select

from backend.db.models.rol import Rol
from backend.db.models.usuario import Usuario
from backend.db.repositories.base import BaseRepository


class RolRepository(BaseRepository[Rol]):
    model = Rol

    async def get_by_nombre(self, nombre_rol: str) -> Rol | None:
        query = select(Rol).where(Rol.nombre_rol == nombre_rol)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def has_usuarios(self, rol_id: int) -> bool:
        query = select(exists().where(Usuario.id_rol == rol_id))
        return bool(await self.db.scalar(query))
