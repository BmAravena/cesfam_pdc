from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.establecimiento import (
    EstablecimientoCreate,
    EstablecimientoUpdate,
)
from backend.db.models.establecimiento import Establecimiento
from backend.db.repositories.establecimiento_repo import EstablecimientoRepository


class EstablecimientoService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = EstablecimientoRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Establecimiento]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, establecimiento_id: int) -> Establecimiento:
        establecimiento = await self.repo.get(establecimiento_id)
        if establecimiento is None:
            raise ValueError(
                f"Establecimiento {establecimiento_id} no encontrado"
            )
        return establecimiento

    async def get_by_nombre(self, nombre_centro: str) -> Establecimiento | None:
        return await self.repo.get_by_nombre(nombre_centro)

    async def get_by_tipo(self, tipo_centro: str) -> list[Establecimiento]:
        return await self.repo.get_by_tipo(tipo_centro)

    async def create(self, data: EstablecimientoCreate) -> Establecimiento:
        if await self.repo.get_by_nombre(data.nombre_centro):
            raise ValueError(
                f"El establecimiento '{data.nombre_centro}' ya existe"
            )

        establecimiento = Establecimiento(
            nombre_centro=data.nombre_centro,
            tipo_centro=data.tipo_centro,
        )
        return await self.repo.create(establecimiento)

    async def update(
        self, establecimiento_id: int, data: EstablecimientoUpdate
    ) -> Establecimiento:
        establecimiento = await self.get(establecimiento_id)
        cambios = data.model_dump(exclude_unset=True)

        nuevo_nombre = cambios.get("nombre_centro")
        if nuevo_nombre and nuevo_nombre != establecimiento.nombre_centro:
            if await self.repo.get_by_nombre(nuevo_nombre):
                raise ValueError(f"El establecimiento '{nuevo_nombre}' ya existe")

        for campo, valor in cambios.items():
            setattr(establecimiento, campo, valor)

        return await self.repo.update(establecimiento)

    async def delete(self, establecimiento_id: int) -> None:
        establecimiento = await self.get(establecimiento_id)
        if await self.repo.has_asociados(establecimiento_id):
            raise ValueError(
                "No se puede eliminar un establecimiento con datos asociados"
            )
        await self.repo.delete(establecimiento)
