from sqlalchemy import select

from backend.db.models.auditoria_log import AuditoriaLog
from backend.db.repositories.base import BaseRepository


class AuditoriaLogRepository(BaseRepository[AuditoriaLog]):
    model = AuditoriaLog

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
