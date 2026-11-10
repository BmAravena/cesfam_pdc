"""Consulta de la bitácora de auditoría (append-only)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.auditoria_log import AuditoriaLogResponse
from backend.core.security import require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.auditoria_log_service import AuditoriaLogService
from backend.services.authz import ROL_ADMIN, ROL_COMUNAL

router = APIRouter(prefix="/auditoria", tags=["auditoría"])


@router.get(
    "",
    response_model=list[AuditoriaLogResponse],
    summary="Listar logs de auditoría",
)
async def listar_auditoria(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL))],
    id_usuario: Annotated[int | None, Query(gt=0)] = None,
    id_establecimiento: Annotated[int | None, Query(gt=0)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[AuditoriaLogResponse]:
    return await AuditoriaLogService(db).listar(
        id_usuario=id_usuario,
        id_establecimiento=id_establecimiento,
        skip=skip,
        limit=limit,
    )
