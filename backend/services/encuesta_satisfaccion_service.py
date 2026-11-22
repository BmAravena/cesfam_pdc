from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.encuesta_satisfaccion import (
    EncuestaSatisfaccionCreate,
)
from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.models.usuario import Usuario
from backend.db.repositories.encuesta_satisfaccion_repo import (
    EncuestaSatisfaccionRepository,
)
from backend.services.authz import (
    puede_acceder_establecimiento,
    tiene_alcance_global,
)
from backend.services.exceptions import NotFoundError, PermissionDenied


class EncuestaSatisfaccionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = EncuestaSatisfaccionRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[EncuestaSatisfaccion]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, encuesta_id: int) -> EncuestaSatisfaccion:
        encuesta = await self.repo.get(encuesta_id)
        if encuesta is None:
            raise NotFoundError(f"Encuesta {encuesta_id} no encontrada")
        return encuesta

    async def get_by_establecimiento(
        self, establecimiento_id: int, skip: int = 0, limit: int = 100
    ) -> list[EncuestaSatisfaccion]:
        return await self.repo.get_by_establecimiento(
            establecimiento_id, skip=skip, limit=limit
        )

    async def create(self, data: EncuestaSatisfaccionCreate) -> EncuestaSatisfaccion:
        encuesta = EncuestaSatisfaccion(
            id_establecimiento=data.id_establecimiento,
            datos_documento=data.datos_documento,
        )
        return await self.repo.create(encuesta)

    async def reporte(
        self,
        usuario: Usuario,
        id_establecimiento: int | None = None,
    ) -> list[dict]:
        """Reporte de satisfacción según el alcance del rol."""
        nombre_rol = usuario.rol.nombre_rol

        if id_establecimiento is not None and not puede_acceder_establecimiento(
            nombre_rol,
            usuario.id_establecimiento,
            id_establecimiento,
        ):
            raise PermissionDenied(
                "No tiene acceso a encuestas de ese establecimiento"
            )

        if not tiene_alcance_global(nombre_rol):
            if usuario.id_establecimiento is None:
                return []
            id_establecimiento = usuario.id_establecimiento

        return await self.repo.reporte_por_establecimiento(id_establecimiento)
