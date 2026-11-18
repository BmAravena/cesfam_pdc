"""Requerimientos OIRS: ingreso público, seguimiento y gestión interna."""

from typing import Annotated
from backend.db.models import auditoria_log
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoEstadisticaItem,
    RequerimientoOirsCreate,
    RequerimientoOirsCreatePublico,
    RequerimientoOirsEstadoUpdate,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsResponder,
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
    request: Request,  # <-- Agregamos Request para obtener la IP
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """El código de seguimiento y el plazo legal se generan en el servicio."""
    service = RequerimientoOirsService(db)
    ip_origen = request.client.host if request.client else "127.0.0.1"
    return await service.create(
        RequerimientoOirsCreate(**data.model_dump()),
        ip_origen=ip_origen
    )

"""
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
    El código de seguimiento y el plazo legal se generan en el servicio.
    service = RequerimientoOirsService(db)
    return await service.create(RequerimientoOirsCreate(**data.model_dump()))
"""

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


async def registrar_auditoria(
    db: AsyncSession,
    accion: str,
    id_usuario: int | None = None,
    id_requerimiento: int | None = None,
    id_establecimiento: int | None = None,
    request: Request | None = None
):
    ip_cliente = request.client.host if (request and request.client) else "127.0.0.1"
    
    nuevo_log = auditoria_log(
        id_usuario=id_usuario,
        id_requerimiento=id_requerimiento,
        id_establecimiento=id_establecimiento,
        accion=accion,
        ip_origen=ip_cliente
    )
    db.add(nuevo_log)


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


@router.get(
    "/estadisticas",
    response_model=list[RequerimientoEstadisticaItem],
    summary="Métricas de cumplimiento por establecimiento",
)
async def estadisticas_requerimientos(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL))],
) -> list[RequerimientoEstadisticaItem]:
    """Solo Administrador y Encargado Comunal.

    Agrupa por centro los requerimientos ingresados, en proceso,
    respondidos, cerrados, rechazados y vencidos, e indica la tasa de
    cumplimiento (porcentaje de requerimientos no vencidos).
    """
    filas = await RequerimientoOirsService(db).estadisticas()
    return [RequerimientoEstadisticaItem(**fila) for fila in filas]


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


@router.patch(
    "/{requerimiento_id}/respuesta",
    response_model=RequerimientoOirsResponse,
    summary="Responder un requerimiento y registrar auditoría",
)
async def responder_requerimiento(
    requerimiento_id: int,
    data: RequerimientoOirsResponder,
    request: Request,
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RequerimientoOirsResponse:
    """Guarda la respuesta y deja el requerimiento en estado Respondido."""
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
    return await service.responder(
        requerimiento_id,
        data.respuesta,
        id_usuario=usuario.id_usuario,
        id_establecimiento=requerimiento.id_establecimiento,
        ip_origen=ip_origen,
    )
