"""Catálogo de roles del sistema (solo Administrador)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.rol import RolResponse
from backend.core.security import require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import ROL_ADMIN
from backend.services.rol_service import RolService

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get(
    "",
    response_model=list[RolResponse],
    summary="Listar roles (solo Administrador)",
)
async def listar_roles(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN))],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[RolResponse]:
    return await RolService(db).get_all(skip=skip, limit=limit)
