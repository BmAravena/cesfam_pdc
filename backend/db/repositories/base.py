from typing import Generic, Sequence, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """CRUD genérico para los modelos. Usa flush(), no commit().

    La transacción (commit/rollback) la controla el servicio o la
    dependencia get_db, para que varias operaciones sean atómicas.
    """

    model: type[ModelT]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, obj_id: int) -> ModelT | None:
        return await self.db.get(self.model, obj_id)

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[ModelT]:
        query = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.flush()
