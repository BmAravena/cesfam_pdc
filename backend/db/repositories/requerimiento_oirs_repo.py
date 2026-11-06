from datetime import date

from sqlalchemy import func, select

from backend.db.models.establecimiento import Establecimiento
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

    async def estadisticas_por_establecimiento(self) -> list[dict]:
        """Agrupa requerimientos por centro y calcula conteos por estado.

        `vencidos` considera solo requerimientos abiertos (ni respondidos,
        cerrados ni rechazados) cuya fecha_limite ya pasó.
        """
        req = RequerimientoOirs
        hoy = date.today()
        finalizados = ("Respondido", "Cerrado", "Rechazado")

        query = (
            select(
                req.id_establecimiento,
                Establecimiento.nombre_centro,
                func.count(req.id_requerimiento).label("total"),
                func.count(req.id_requerimiento)
                .filter(req.estado == "Ingresado")
                .label("ingresados"),
                func.count(req.id_requerimiento)
                .filter(req.estado == "En Proceso")
                .label("en_proceso"),
                func.count(req.id_requerimiento)
                .filter(req.estado == "Respondido")
                .label("respondidos"),
                func.count(req.id_requerimiento)
                .filter(req.estado == "Cerrado")
                .label("cerrados"),
                func.count(req.id_requerimiento)
                .filter(req.estado == "Rechazado")
                .label("rechazados"),
                func.count(req.id_requerimiento)
                .filter(
                    req.estado.notin_(finalizados) & (req.fecha_limite < hoy)
                )
                .label("vencidos"),
            )
            .join(
                Establecimiento,
                Establecimiento.id_establecimiento == req.id_establecimiento,
            )
            .group_by(req.id_establecimiento, Establecimiento.nombre_centro)
            .order_by(Establecimiento.nombre_centro)
        )
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

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
