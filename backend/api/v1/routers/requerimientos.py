"""Requerimientos OIRS: ingreso público, seguimiento y gestión interna."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoOirsCreate,
    RequerimientoOirsCreatePublico,
    RequerimientoOirsEstadoUpdate,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsResponse,
)
from backend.core.security import require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import (
    ROL_ADMIN,
    ROL_COMUNAL,
    ROL_LOCAL,
    puede_acceder_establecimiento,
)
from backend.services.exceptions import PermissionDenied
from backend.services.requerimiento_oirs_service import RequerimientoOirsService

router = APIRouter(prefix="/requerimientos", tags=["requerimientos"])


@router.post(
    "",
    response_model=RequerimientoOirsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingresar un requerimiento (público)",
)
async def crear_requerimiento(
    data: RequerimientoOirsCreatePublico,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """El código de seguimiento y el plazo legal se generan en el servicio."""
    service = RequerimientoOirsService(db)
    return await service.create(RequerimientoOirsCreate(**data.model_dump()))


@router.get(
    "/seguimiento/{codigo_seguimiento}",
    response_model=RequerimientoOirsPublicoResponse,
    summary="Consultar estado por código de seguimiento (público)",
)
async def seguimiento(
    codigo_seguimiento: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RequerimientoOirsPublicoResponse:
    return await RequerimientoOirsService(db).get_publico(codigo_seguimiento)


@router.get(
    "",
    response_model=list[RequerimientoOirsResponse],
    summary="Listar requerimientos según el alcance del rol",
)
async def listar_requerimientos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[RequerimientoOirsResponse]:
    """Funcionario Local: solo su centro. Roles globales: todos o filtro."""
    return await RequerimientoOirsService(db).listar_autorizado(
        usuario,
        establecimiento_id=establecimiento_id,
        skip=skip,
        limit=limit,
    )


@router.patch(
    "/{requerimiento_id}/estado",
    response_model=RequerimientoOirsResponse,
    summary="Cambiar el estado y registrar auditoría",
)
async def cambiar_estado(
    requerimiento_id: int,
    data: RequerimientoOirsEstadoUpdate,
    request: Request,
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RequerimientoOirsResponse:
    """El servicio actualiza el estado y crea el log en la misma transacción."""
    service = RequerimientoOirsService(db)
    requerimiento = await service.get(requerimiento_id)

    if not puede_acceder_establecimiento(
        usuario.rol.nombre_rol,
        usuario.id_establecimiento,
        requerimiento.id_establecimiento,
    ):
        raise PermissionDenied(
            "No tiene acceso a requerimientos de ese establecimiento"
        )

    ip_origen = request.client.host if request.client else None
    return await service.cambiar_estado(
        requerimiento_id,
        data.estado,
        id_usuario=usuario.id_usuario,
        id_establecimiento=requerimiento.id_establecimiento,
        ip_origen=ip_origen,
    )
