import secrets
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoOirsCreate,
    RequerimientoOirsUpdate,
)
from backend.db.models.requerimiento_oirs import RequerimientoOirs
from backend.db.repositories.requerimiento_oirs_repo import (
    RequerimientoOirsRepository,
)

DIAS_HABILES_PLAZO = 15  # Ley N° 20.584


def sumar_dias_habiles(inicio: date, dias: int) -> date:
    """Suma días hábiles (lunes a viernes), sin considerar feriados."""
    actual = inicio
    restantes = dias
    while restantes > 0:
        actual += timedelta(days=1)
        if actual.weekday() < 5:
            restantes -= 1
    return actual


class RequerimientoOirsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = RequerimientoOirsRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[RequerimientoOirs]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, requerimiento_id: int) -> RequerimientoOirs:
        requerimiento = await self.repo.get(requerimiento_id)
        if requerimiento is None:
            raise ValueError(f"Requerimiento {requerimiento_id} no encontrado")
        return requerimiento

    async def get_by_codigo(self, codigo: str) -> RequerimientoOirs | None:
        return await self.repo.get_by_codigo(codigo)

    async def get_by_establecimiento(
        self, establecimiento_id: int, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        return await self.repo.get_by_establecimiento(
            establecimiento_id, skip=skip, limit=limit
        )

    async def get_by_estado(
        self, estado: str, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        return await self.repo.get_by_estado(estado, skip=skip, limit=limit)

    async def create(self, data: RequerimientoOirsCreate) -> RequerimientoOirs:
        codigo = data.codigo_seguimiento or await self._generar_codigo()
        if await self.repo.get_by_codigo(codigo):
            raise ValueError(f"El código '{codigo}' ya existe")

        fecha_ingreso = data.fecha_ingreso or date.today()
        fecha_limite = data.fecha_limite or sumar_dias_habiles(
            fecha_ingreso, DIAS_HABILES_PLAZO
        )

        requerimiento = RequerimientoOirs(
            codigo_seguimiento=codigo,
            tipo_solicitud=data.tipo_solicitud,
            detalle_solicitud=data.detalle_solicitud,
            estado=data.estado,
            fecha_ingreso=fecha_ingreso,
            fecha_limite=fecha_limite,
            es_anonimo=data.es_anonimo,
            id_establecimiento=data.id_establecimiento,
        )
        return await self.repo.create(requerimiento)

    async def update(
        self, requerimiento_id: int, data: RequerimientoOirsUpdate
    ) -> RequerimientoOirs:
        requerimiento = await self.get(requerimiento_id)
        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            setattr(requerimiento, campo, valor)

        return await self.repo.update(requerimiento)

    async def delete(self, requerimiento_id: int) -> None:
        requerimiento = await self.get(requerimiento_id)
        await self.repo.delete(requerimiento)

    async def _generar_codigo(self) -> str:
        """Formato OIRS-AAAAMMDD-XXXX (18 caracteres, cabe en VARCHAR(20))."""
        for _ in range(5):
            codigo = f"OIRS-{date.today():%Y%m%d}-{secrets.token_hex(2).upper()}"
            if await self.repo.get_by_codigo(codigo) is None:
                return codigo
        raise ValueError("No se pudo generar un código de seguimiento único")
