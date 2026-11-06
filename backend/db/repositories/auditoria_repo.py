from sqlalchemy import select

from backend.db.models.auditoria_log import AuditoriaLog
from backend.db.repositories.base import BaseRepository


class AuditoriaLogRepository(BaseRepository[AuditoriaLog]):
    model = AuditoriaLog
    async def get_by_usuario_id(self, usuario_id: int) -> list[AuditoriaLog]:
        query = select(AuditoriaLog).where(AuditoriaLog.usuario_id == usuario_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())
