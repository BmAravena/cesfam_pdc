from sqlalchemy import select

from backend.db.models.auditoria_log import AuditoriaLog
from backend.db.repositories.base import BaseRepository


class AuditoriaLogRepository(BaseRepository[AuditoriaLog]):
    """Repositorio append-only: no permite update ni delete."""

    model = AuditoriaLog

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[AuditoriaLog]:
        query = (
            select(AuditoriaLog)
            .order_by(AuditoriaLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_usuario(
        self, id_usuario: int, skip: int = 0, limit: int = 100
    ) -> list[AuditoriaLog]:
        query = (
            select(AuditoriaLog)
            .where(AuditoriaLog.id_usuario == id_usuario)
            .order_by(AuditoriaLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_establecimiento(
        self, id_establecimiento: int, skip: int = 0, limit: int = 100
    ) -> list[AuditoriaLog]:
        query = (
            select(AuditoriaLog)
            .where(AuditoriaLog.id_establecimiento == id_establecimiento)
            .order_by(AuditoriaLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_filtrado(
        self,
        id_usuario: int | None = None,
        id_establecimiento: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AuditoriaLog]:
        query = select(AuditoriaLog).order_by(AuditoriaLog.timestamp.desc())
        if id_usuario is not None:
            query = query.where(AuditoriaLog.id_usuario == id_usuario)
        if id_establecimiento is not None:
            query = query.where(
                AuditoriaLog.id_establecimiento == id_establecimiento
            )
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, obj: AuditoriaLog) -> AuditoriaLog:
        raise PermissionError("auditoria_log es append-only: no se permite UPDATE")

    async def delete(self, obj: AuditoriaLog) -> None:
        raise PermissionError("auditoria_log es append-only: no se permite DELETE")
