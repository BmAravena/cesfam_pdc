from datetime import date

from sqlalchemy import func, select

from backend.db.models.establecimiento import Establecimiento
from backend.db.models.requerimiento_oirs import RequerimientoOirs
from backend.db.repositories.base import BaseRepository

TIPO_RECLAMO = "Reclamo"


def _rango_anio(anio: int) -> tuple[date, date]:
    """Límites [inicio, fin) del año calendario para `fecha_ingreso`."""
    return date(anio, 1, 1), date(anio + 1, 1, 1)


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

    async def listar_ligero(
        self,
        id_establecimiento: int | None = None,
        estado: str | None = None,
        anio: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict]:
        """Bandeja: proyecta solo las columnas visibles en la tabla."""
        req = RequerimientoOirs
        query = (
            select(
                req.id_requerimiento,
                req.codigo_seguimiento,
                req.tipo_solicitud,
                req.estado,
                req.fecha_ingreso,
                req.fecha_limite,
                req.id_establecimiento,
                Establecimiento.nombre_centro,
            )
            .join(
                Establecimiento,
                Establecimiento.id_establecimiento == req.id_establecimiento,
            )
        )
        if id_establecimiento is not None:
            query = query.where(req.id_establecimiento == id_establecimiento)
        if estado is not None:
            query = query.where(req.estado == estado)
        if anio is not None:
            inicio, fin = _rango_anio(anio)
            query = query.where(
                req.fecha_ingreso >= inicio,
                req.fecha_ingreso < fin,
            )

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def resumen(self, id_establecimiento: int | None = None) -> dict:
        """Totales agregados (una fila) para el panel de control.

        Si `id_establecimiento` es None se agrega sobre todos los centros.
        """
        req = RequerimientoOirs
        hoy = date.today()
        finalizados = ("Respondido", "Cerrado", "Rechazado")

        query = select(
            func.count(req.id_requerimiento).label("total"),
            func.count(req.id_requerimiento)
            .filter(req.estado.in_(("Ingresado", "En Proceso")))
            .label("abiertos"),
            func.count(req.id_requerimiento)
            .filter(req.estado == "Respondido")
            .label("respondidos"),
            func.count(req.id_requerimiento)
            .filter(req.estado.notin_(finalizados) & (req.fecha_limite < hoy))
            .label("vencidos"),
        )
        if id_establecimiento is not None:
            query = query.where(req.id_establecimiento == id_establecimiento)

        result = await self.db.execute(query)
        return dict(result.mappings().one())

    async def estadisticas_por_establecimiento(
        self,
        id_establecimiento: int | None = None,
    ) -> list[dict]:
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
        if id_establecimiento is not None:
            query = query.where(req.id_establecimiento == id_establecimiento)

        result = await self.db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def reclamos_por_establecimiento(
        self,
        id_establecimiento: int | None = None,
        anio: int | None = None,
    ) -> list[dict]:
        """Cuenta reclamos por centro, incluyendo sedes sin reclamos.

        Se parte de `establecimiento` con LEFT JOIN para que los centros con
        0 reclamos también aparezcan (el panel los muestra explícitamente).
        Si se indica `anio`, solo se cuentan reclamos ingresados ese año.
        """
        req = RequerimientoOirs
        condicion = (req.id_establecimiento == Establecimiento.id_establecimiento) & (
            req.tipo_solicitud == TIPO_RECLAMO
        )
        if anio is not None:
            inicio, fin = _rango_anio(anio)
            condicion = condicion & (req.fecha_ingreso >= inicio) & (
                req.fecha_ingreso < fin
            )

        query = (
            select(
                Establecimiento.id_establecimiento,
                Establecimiento.nombre_centro,
                func.count(req.id_requerimiento).label("total_reclamos"),
            )
            .select_from(Establecimiento)
            .outerjoin(req, condicion)
            .group_by(
                Establecimiento.id_establecimiento,
                Establecimiento.nombre_centro,
            )
            .order_by(Establecimiento.nombre_centro)
        )
        if id_establecimiento is not None:
            query = query.where(
                Establecimiento.id_establecimiento == id_establecimiento
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
