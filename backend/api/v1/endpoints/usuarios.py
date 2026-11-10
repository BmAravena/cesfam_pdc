"""Gestión de usuarios del sistema (CRUD administrativo)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)
from backend.core.security import get_current_user, require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import ROL_ADMIN
from backend.services.exceptions import BusinessRuleError
from backend.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

AdminUser = Annotated[Usuario, Depends(require_roles(ROL_ADMIN))]


@router.get(
    "/me",
    response_model=UsuarioResponse,
    summary="Perfil del usuario autenticado",
)
async def perfil(
    usuario: Annotated[Usuario, Depends(get_current_user)],
) -> Usuario:
    return usuario


@router.get(
    "",
    response_model=list[UsuarioResponse],
    summary="Listar usuarios (solo Administrador)",
)
async def listar_usuarios(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: AdminUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    incluir_inactivos: Annotated[bool, Query()] = False,
) -> list[UsuarioResponse]:
    return await UsuarioService(db).get_all(
        skip=skip,
        limit=limit,
        incluir_inactivos=incluir_inactivos,
    )


@router.post(
    "",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un usuario (solo Administrador)",
)
async def crear_usuario(
    data: UsuarioCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: AdminUser,
) -> UsuarioResponse:
    return await UsuarioService(db).create(data)


@router.get(
    "/{usuario_id}",
    response_model=UsuarioResponse,
    summary="Obtener un usuario (solo Administrador)",
)
async def obtener_usuario(
    usuario_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: AdminUser,
) -> UsuarioResponse:
    return await UsuarioService(db).get(usuario_id)


@router.patch(
    "/{usuario_id}",
    response_model=UsuarioResponse,
    summary="Actualizar un usuario (solo Administrador)",
)
async def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: AdminUser,
) -> UsuarioResponse:
    # Un administrador no puede quitarse a sí mismo el acceso.
    if data.activo is False and admin.id_usuario == usuario_id:
        raise BusinessRuleError("No puede desactivar su propio usuario")
    return await UsuarioService(db).update(usuario_id, data)


@router.delete(
    "/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Dar de baja un usuario (solo Administrador)",
)
async def eliminar_usuario(
    usuario_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: AdminUser,
) -> None:
    """Borrado lógico: el usuario queda inactivo y no puede autenticarse."""
    # Evita que el administrador se elimine a sí mismo y pierda el acceso.
    if admin.id_usuario == usuario_id:
        raise BusinessRuleError("No puede eliminar su propio usuario")
    await UsuarioService(db).delete(usuario_id)
