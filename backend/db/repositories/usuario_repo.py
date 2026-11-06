from sqlalchemy import select

from backend.db.models.usuario import Usuario
from backend.db.repositories.base import BaseRepository


class UsuarioRepository(BaseRepository[Usuario]):
    model = Usuario

    async def get_by_email(self, email: str) -> Usuario | None:
        query = select(Usuario).where(Usuario.email == email)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_rut(self, rut: str) -> Usuario | None:
        query = select(Usuario).where(Usuario.rut == rut)
        result = await self.db.execute(query)
        return result.scalars().first()
