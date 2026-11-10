from sqlalchemy import exists, or_, select

from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.models.establecimiento import Establecimiento
from backend.db.models.requerimiento_oirs import RequerimientoOirs
from backend.db.models.usuario import Usuario
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

    async def has_asociados(self, establecimiento_id: int) -> bool:
        query = select(
            or_(
                exists().where(
                    Usuario.id_establecimiento == establecimiento_id
                ),
                exists().where(
                    RequerimientoOirs.id_establecimiento == establecimiento_id
                ),
                exists().where(
                    EncuestaSatisfaccion.id_establecimiento == establecimiento_id
                ),
            )
        )
        return bool(await self.db.scalar(query))
