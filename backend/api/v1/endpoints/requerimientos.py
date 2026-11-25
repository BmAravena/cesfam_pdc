"""Requerimientos OIRS: ingreso público, seguimiento y gestión interna."""

from typing import Annotated
from backend.db.models import auditoria_log
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoResumen,
    RequerimientoEstadisticaItem,
    RequerimientoOirsCreate,
    RequerimientoOirsCreatePublico,
    RequerimientoOirsEstadoUpdate,
    RequerimientoOirsListItem,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsResponder,
    RequerimientoOirsResponse,
    ReclamosResumen,
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

    datos = data.model_dump()
    nombre = datos.pop("nombre_solicitante", None)
    contacto = datos.pop("contacto_solicitante", None)

    # Los datos de contacto se guardan al inicio del detalle para que OIRS
    # pueda responder. El schema ya validó el formato del contacto.
    detalle = datos["detalle_solicitud"].strip()
    if not data.es_anonimo:
        detalle = f"Solicitante: {nombre}\nContacto: {contacto}\n\n{detalle}"
    datos["detalle_solicitud"] = detalle

    return await service.create(
        RequerimientoOirsCreate(**datos),
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
    response_model=list[RequerimientoOirsListItem],
    summary="Listar requerimientos según el alcance del rol",
)
async def listar_requerimientos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    estado: Annotated[str | None, Query(max_length=30)] = None,
    anio: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[RequerimientoOirsListItem]:
    """Funcionario Local: solo su centro. Roles globales: todos o filtro.

    `anio` filtra por el año de `fecha_ingreso`; sin valor no se acota.
    Devuelve solo las columnas de la bandeja; el detalle se consulta por id.
    """
    return await RequerimientoOirsService(db).listar_autorizado_ligero(
        usuario,
        establecimiento_id=establecimiento_id,
        estado=estado,
        anio=anio,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/resumen",
    response_model=RequerimientoResumen,
    summary="Totales del panel de control según el alcance del rol",
)
async def resumen_requerimientos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    anio: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> RequerimientoResumen:
    """Agrega en la base los indicadores que muestra el dashboard."""
    fila = await RequerimientoOirsService(db).resumen(
        usuario,
        establecimiento_id=establecimiento_id,
        anio=anio,
    )
    return RequerimientoResumen(**fila)


@router.get(
    "/estadisticas",
    response_model=list[RequerimientoEstadisticaItem],
    summary="Métricas de cumplimiento por establecimiento",
)
async def estadisticas_requerimientos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    anio: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[RequerimientoEstadisticaItem]:
    """Local: solo su centro. Comunal y Administrador: comparativo global."""
    filas = await RequerimientoOirsService(db).estadisticas(
        usuario,
        establecimiento_id=establecimiento_id,
        anio=anio,
    )
    return [RequerimientoEstadisticaItem(**fila) for fila in filas]


@router.get(
    "/reclamos/resumen",
    response_model=ReclamosResumen,
    summary="Total de reclamos y desglose por establecimiento",
)
async def resumen_reclamos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    anio: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> ReclamosResumen:
    """Cuenta requerimientos de tipo Reclamo según el alcance del rol.

    Los roles globales reciben el total comunal y una fila por establecimiento
    (incluidas las sedes con 0 reclamos); el Funcionario Local solo su sede.
    """
    fila = await RequerimientoOirsService(db).resumen_reclamos(
        usuario,
        anio=anio,
    )
    return ReclamosResumen(**fila)


@router.get(
    "/anios",
    response_model=list[int],
    summary="Años con requerimientos registrados",
)
async def anios_requerimientos(
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[int]:
    """Años disponibles según el alcance del rol, del más reciente al más antiguo."""
    return await RequerimientoOirsService(db).anios_disponibles(usuario)


@router.get(
    "/{requerimiento_id}",
    response_model=RequerimientoOirsResponse,
    summary="Obtener el detalle de un requerimiento",
)
async def obtener_requerimiento(
    requerimiento_id: int,
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RequerimientoOirsResponse:
    """Detalle completo (incluye detalle_solicitud y respuesta).

    Se valida el alcance del rol para no exponer casos de otra sede.
    """
    return await RequerimientoOirsService(db).get_autorizado(
        usuario,
        requerimiento_id,
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
