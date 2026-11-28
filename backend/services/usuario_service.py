from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.usuario import UsuarioCreate, UsuarioUpdate
from backend.core.email_dominio import (
    DominioNoVerificableError,
    DominioSinRegistrosError,
    verificar_dominio_correo,
)
from backend.core.rut import RutInvalido, limpiar_rut, validar_rut
from backend.core.security import hash_password, verify_password
from backend.db.models.establecimiento import Establecimiento
from backend.db.models.rol import Rol
from backend.db.models.usuario import Usuario
from backend.db.repositories.usuario_repo import UsuarioRepository
from backend.services.authz import ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL
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

    async def _get_rol(self, rol_id: int) -> Rol:
        rol = await self.db.get(Rol, rol_id)
        if rol is None:
            raise BusinessRuleError(f"Rol {rol_id} no encontrado")
        return rol

    async def _normalizar_establecimiento(
        self,
        rol: Rol,
        establecimiento_id: int | None,
    ) -> int | None:
        """Solo el Funcionario Local requiere una sede.

        El Encargado Comunal (y el Administrador) tienen alcance global, por lo
        que su `id_establecimiento` se guarda como NULL.
        """
        if rol.nombre_rol == ROL_COMUNAL:
            return None

        if rol.nombre_rol == ROL_LOCAL:
            if establecimiento_id is None:
                raise BusinessRuleError(
                    "El Funcionario Local requiere un establecimiento"
                )
            if await self.db.get(Establecimiento, establecimiento_id) is None:
                raise BusinessRuleError("El establecimiento no existe")
            return establecimiento_id

        return establecimiento_id

    async def _verificar_dominio_email(self, email: str) -> None:
        """Comprueba que el dominio del correo tenga MX/A válidos."""
        try:
            await verificar_dominio_correo(email)
        except DominioSinRegistrosError as exc:
            raise BusinessRuleError(
                "El dominio del correo no puede recibir mensajes. "
                "Revisa que esté bien escrito.",
                campo="email",
            ) from exc
        except DominioNoVerificableError as exc:
            raise BusinessRuleError(
                "No pudimos verificar el dominio del correo ahora. "
                "Intenta nuevamente en unos segundos.",
                campo="email",
            ) from exc

    async def create(
        self,
        data: UsuarioCreate,
        *,
        permitir_admin: bool = False,
    ) -> Usuario:
        rol = await self._get_rol(data.id_rol)
        if rol.nombre_rol == ROL_ADMIN and not permitir_admin:
            raise BusinessRuleError(
                "No se puede crear otro Administrador del Sistema"
            )

        establecimiento_id = await self._normalizar_establecimiento(
            rol, data.id_establecimiento
        )

        if await self.repo.get_by_email(data.email):
            raise ConflictError(
                "Este correo ya está registrado en el sistema.",
                campo="email",
            )
        if await self.repo.get_by_rut(data.rut):
            raise ConflictError("El RUT ya está registrado")

        await self._verificar_dominio_email(str(data.email))

        usuario = Usuario(
            rut=data.rut,
            nombre=data.nombre,
            email=str(data.email),
            password_hash=hash_password(data.password),
            id_rol=rol.id_rol,
            id_establecimiento=establecimiento_id,
        )
        return await self.repo.create(usuario)

    async def update(self, usuario_id: int, data: UsuarioUpdate) -> Usuario:
        usuario = await self.get(usuario_id)
        cambios = data.model_dump(exclude_unset=True)

        # Mismas reglas de rol/sede que en la creación, pero solo si cambian.
        if "id_rol" in cambios or "id_establecimiento" in cambios:
            if "id_rol" in cambios:
                rol = await self._get_rol(cambios["id_rol"])
                if (
                    rol.nombre_rol == ROL_ADMIN
                    and usuario.id_rol != rol.id_rol
                ):
                    raise BusinessRuleError(
                        "No se puede asignar el rol Administrador del Sistema"
                    )
            else:
                rol = await self._get_rol(usuario.id_rol)

            establecimiento_efectivo = cambios.get(
                "id_establecimiento", usuario.id_establecimiento
            )
            cambios["id_establecimiento"] = (
                await self._normalizar_establecimiento(
                    rol, establecimiento_efectivo
                )
            )

        password = cambios.pop("password", None)
        if password is not None:
            cambios["password_hash"] = hash_password(password)

        if "activo" in cambios:
            if cambios["activo"] and not usuario.activo:
                usuario.fecha_baja = None
            elif cambios["activo"] is False and usuario.activo:
                usuario.fecha_baja = datetime.now(timezone.utc)

        nuevo_email = cambios.get("email")
        if nuevo_email and str(nuevo_email) != usuario.email:
            existente = await self.repo.get_by_email(str(nuevo_email))
            # La unicidad excluye al propio usuario que se está editando.
            if existente is not None and existente.id_usuario != usuario_id:
                raise ConflictError(
                    "Este correo ya está registrado en el sistema.",
                    campo="email",
                )
            await self._verificar_dominio_email(str(nuevo_email))

        if "rut" in cambios:
            nuevo_rut = cambios["rut"]
            if nuevo_rut is None or not nuevo_rut.strip():
                raise BusinessRuleError("El RUT no puede estar vacío")

            # Solo se valida si realmente cambia: así un usuario antiguo con
            # un RUT legado puede seguir editándose sin quedar bloqueado.
            if limpiar_rut(nuevo_rut) == limpiar_rut(usuario.rut):
                # Misma persona: conservamos el valor almacenado tal cual.
                cambios["rut"] = usuario.rut
            else:
                try:
                    nuevo_rut = validar_rut(nuevo_rut)
                except RutInvalido as exc:
                    raise BusinessRuleError(str(exc)) from exc

                cambios["rut"] = nuevo_rut
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
