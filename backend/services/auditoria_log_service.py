from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.auditoria_log import AuditoriaLogCreate
from backend.db.models.auditoria_log import AuditoriaLog
from backend.db.repositories.auditoria_log_repo import AuditoriaLogRepository


class AuditoriaLogService:
    """Registro append-only: solo se crean y consultan logs."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = AuditoriaLogRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[AuditoriaLog]:
        return await self.repo.get_all(skip=skip, limit=limit)

    async def get(self, log_id: int) -> AuditoriaLog:
        log = await self.repo.get(log_id)
        if log is None:
            raise ValueError(f"Log {log_id} no encontrado")
        return log

    async def get_by_usuario(
        self, usuario_id: int, skip: int = 0, limit: int = 100
    ) -> list[AuditoriaLog]:
        return await self.repo.get_by_usuario(usuario_id, skip=skip, limit=limit)

    async def get_by_establecimiento(
        self, establecimiento_id: int, skip: int = 0, limit: int = 100
    ) -> list[AuditoriaLog]:
        return await self.repo.get_by_establecimiento(
            establecimiento_id, skip=skip, limit=limit
        )

    async def registrar(self, data: AuditoriaLogCreate) -> AuditoriaLog:
        log = AuditoriaLog(
            id_usuario=data.id_usuario,
            id_establecimiento=data.id_establecimiento,
            accion=data.accion,
            ip_origen=str(data.ip_origen) if data.ip_origen else None,
        )
        return await self.repo.create(log)
