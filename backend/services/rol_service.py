from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.rol import RolCreate, RolUpdate
from backend.db.models.rol import Rol
from backend.db.repositories.rol_repo import RolRepository
from backend.services.exceptions import (
    BusinessRuleError,
    ConflictError,
    NotFoundError,
)


class RolService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = RolRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Rol]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, rol_id: int) -> Rol:
        rol = await self.repo.get(rol_id)
        if rol is None:
            raise NotFoundError(f"Rol {rol_id} no encontrado")
        return rol

    async def get_by_nombre(self, nombre_rol: str) -> Rol | None:
        return await self.repo.get_by_nombre(nombre_rol)

    async def create(self, data: RolCreate) -> Rol:
        if await self.repo.get_by_nombre(data.nombre_rol):
            raise ConflictError(f"El rol '{data.nombre_rol}' ya existe")

        rol = Rol(nombre_rol=data.nombre_rol, descripcion=data.descripcion)
        return await self.repo.create(rol)

    async def update(self, rol_id: int, data: RolUpdate) -> Rol:
        rol = await self.get(rol_id)
        cambios = data.model_dump(exclude_unset=True)

        nuevo_nombre = cambios.get("nombre_rol")
        if nuevo_nombre and nuevo_nombre != rol.nombre_rol:
            if await self.repo.get_by_nombre(nuevo_nombre):
                raise ConflictError(f"El rol '{nuevo_nombre}' ya existe")

        for campo, valor in cambios.items():
            setattr(rol, campo, valor)

        return await self.repo.update(rol)

    async def delete(self, rol_id: int) -> None:
        rol = await self.get(rol_id)
        if await self.repo.has_usuarios(rol_id):
            raise BusinessRuleError("No se puede eliminar un rol con usuarios asignados")
        await self.repo.delete(rol)
