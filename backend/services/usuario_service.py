from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.usuario import UsuarioCreate, UsuarioUpdate
from backend.db.models.usuario import Usuario
from backend.db.repositories.usuario_repo import UsuarioRepository

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


class UsuarioService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UsuarioRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Usuario]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, usuario_id: int) -> Usuario:
        usuario = await self.repo.get(usuario_id)
        if usuario is None:
            raise ValueError(f"Usuario {usuario_id} no encontrado")
        return usuario

    async def get_by_email(self, email: str) -> Usuario | None:
        return await self.repo.get_by_email(email)

    async def get_by_rut(self, rut: str) -> Usuario | None:
        return await self.repo.get_by_rut(rut)

    async def create(self, data: UsuarioCreate) -> Usuario:
        if await self.repo.get_by_email(data.email):
            raise ValueError("El email ya está registrado")
        if await self.repo.get_by_rut(data.rut):
            raise ValueError("El RUT ya está registrado")

        usuario = Usuario(
            rut=data.rut,
            nombre=data.nombre,
            email=str(data.email),
            password_hash=hash_password(data.password),
            id_rol=data.id_rol,
            id_establecimiento=data.id_establecimiento,
        )
        return await self.repo.create(usuario)

    async def update(self, usuario_id: int, data: UsuarioUpdate) -> Usuario:
        usuario = await self.get(usuario_id)
        cambios = data.model_dump(exclude_unset=True)

        password = cambios.pop("password", None)
        if password is not None:
            cambios["password_hash"] = hash_password(password)

        nuevo_email = cambios.get("email")
        if nuevo_email and nuevo_email != usuario.email:
            if await self.repo.get_by_email(str(nuevo_email)):
                raise ValueError("El email ya está registrado")

        nuevo_rut = cambios.get("rut")
        if nuevo_rut and nuevo_rut != usuario.rut:
            if await self.repo.get_by_rut(nuevo_rut):
                raise ValueError("El RUT ya está registrado")

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        return await self.repo.update(usuario)

    async def delete(self, usuario_id: int) -> None:
        usuario = await self.get(usuario_id)
        await self.repo.delete(usuario)

    async def authenticate(self, email: str, password: str) -> Usuario | None:
        usuario = await self.repo.get_by_email(email)
        if usuario is None or not verify_password(password, usuario.password_hash):
            return None
        return usuario
