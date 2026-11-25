"""Encuestas de satisfacción ciudadana y sus reportes agregados."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.encuesta_satisfaccion import (
    EncuestaReporteItem,
    EncuestaSatisfaccionCreate,
    EncuestaSatisfaccionResponse,
)
from backend.core.security import require_roles
from backend.core.tiempo import ahora_chile
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL
from backend.services.encuesta_satisfaccion_service import (
    EncuestaSatisfaccionService,
)

router = APIRouter(prefix="/encuestas", tags=["encuestas"])

ACCION_CONSULTA = "CONSULTA_REPORTE_ENCUESTAS"
ACCION_EXPORTACION = "EXPORTACION_REPORTE_ENCUESTAS"


def _ip_cliente(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get(
    "/reportes",
    response_model=list[EncuestaReporteItem],
    summary="Métricas de satisfacción por establecimiento",
)
async def reporte_encuestas(
    request: Request,
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    desde: Annotated[date | None, Query()] = None,
    hasta: Annotated[date | None, Query()] = None,
) -> list[EncuestaReporteItem]:
    """Local: solo su centro. Comunal y Administrador: todos o filtro.

    Devuelve totales, promedios y distribución por dimensión, además de los
    comentarios cualitativos disponibles.
    """
    service = EncuestaSatisfaccionService(db)
    filas = await service.reporte(
        usuario,
        establecimiento_id,
        desde=desde,
        hasta=hasta,
    )
    await service.registrar_auditoria(
        usuario,
        ACCION_CONSULTA,
        service.establecimiento_efectivo(usuario, establecimiento_id),
        _ip_cliente(request),
    )
    return [EncuestaReporteItem(**fila) for fila in filas]


@router.get(
    "/reportes/export.csv",
    summary="Exportar respuestas de satisfacción (CSV)",
    response_class=Response,
)
async def exportar_encuestas(
    request: Request,
    usuario: Annotated[
        Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL, ROL_LOCAL))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
    desde: Annotated[date | None, Query()] = None,
    hasta: Annotated[date | None, Query()] = None,
) -> Response:
    service = EncuestaSatisfaccionService(db)
    contenido = await service.exportar_csv(
        usuario,
        establecimiento_id,
        desde=desde,
        hasta=hasta,
    )
    await service.registrar_auditoria(
        usuario,
        ACCION_EXPORTACION,
        service.establecimiento_efectivo(usuario, establecimiento_id),
        _ip_cliente(request),
    )

    nombre = f"encuestas-satisfaccion-{ahora_chile():%Y-%m-%d}.csv"
    return Response(
        content=contenido,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@router.post(
    "",
    response_model=EncuestaSatisfaccionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una encuesta anónima (público)",
)
async def crear_encuesta(
    data: EncuestaSatisfaccionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EncuestaSatisfaccionResponse:
    return await EncuestaSatisfaccionService(db).create(data)
