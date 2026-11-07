from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.usuario import UsuarioCreate, UsuarioUpdate
from backend.core.security import hash_password, verify_password
from backend.db.models.usuario import Usuario
from backend.db.repositories.usuario_repo import UsuarioRepository
from backend.services.exceptions import (
    BusinessRuleError,
    ConflictError,
    NotFoundError,
)


class UsuarioService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UsuarioRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        incluir_inactivos: bool = False,
    ) -> list[Usuario]:
        return await self.repo.get_usuarios(
            incluir_inactivos=incluir_inactivos,
            skip=skip,
            limit=limit,
        )

    async def get(self, usuario_id: int) -> Usuario:
        usuario = await self.repo.get(usuario_id)
        if usuario is None:
            raise NotFoundError(f"Usuario {usuario_id} no encontrado")
        return usuario

    async def get_by_email(self, email: str) -> Usuario | None:
        return await self.repo.get_by_email(email)

    async def get_by_rut(self, rut: str) -> Usuario | None:
        return await self.repo.get_by_rut(rut)

    async def create(self, data: UsuarioCreate) -> Usuario:
        if await self.repo.get_by_email(data.email):
            raise ConflictError("El email ya está registrado")
        if await self.repo.get_by_rut(data.rut):
            raise ConflictError("El RUT ya está registrado")

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

        if "activo" in cambios:
            if cambios["activo"] and not usuario.activo:
                usuario.fecha_baja = None
            elif cambios["activo"] is False and usuario.activo:
                usuario.fecha_baja = datetime.now(timezone.utc)

        nuevo_email = cambios.get("email")
        if nuevo_email and nuevo_email != usuario.email:
            if await self.repo.get_by_email(str(nuevo_email)):
                raise ConflictError("El email ya está registrado")

        nuevo_rut = cambios.get("rut")
        if nuevo_rut and nuevo_rut != usuario.rut:
            if await self.repo.get_by_rut(nuevo_rut):
                raise ConflictError("El RUT ya está registrado")

        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        return await self.repo.update(usuario)

    async def delete(self, usuario_id: int) -> None:
        """Baja lógica: conserva el registro y libera el acceso."""
        usuario = await self.get(usuario_id)
        if not usuario.activo:
            raise BusinessRuleError("El usuario ya está dado de baja")
        usuario.activo = False
        usuario.fecha_baja = datetime.now(timezone.utc)
        await self.repo.update(usuario)

    async def authenticate(self, email: str, password: str) -> Usuario | None:
        usuario = await self.repo.get_by_email(email)
        if (
            usuario is None
            or not usuario.activo
            or not verify_password(password, usuario.password_hash)
        ):
            return None
        return usuario
