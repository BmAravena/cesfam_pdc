"""Encuestas de satisfacción ciudadana y sus reportes agregados."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.encuesta_satisfaccion import (
    EncuestaReporteItem,
    EncuestaSatisfaccionCreate,
    EncuestaSatisfaccionResponse,
)
from backend.core.security import require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import ROL_ADMIN, ROL_COMUNAL
from backend.services.encuesta_satisfaccion_service import (
    EncuestaSatisfaccionService,
)

router = APIRouter(prefix="/encuestas", tags=["encuestas"])


@router.get(
    "/reportes",
    response_model=list[EncuestaReporteItem],
    summary="Métricas de satisfacción por establecimiento",
)
async def reporte_encuestas(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN, ROL_COMUNAL))],
    establecimiento_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[EncuestaReporteItem]:
    """Agrega las claves numéricas `trato`, `tiempo_espera` y `calidad`.

    El Encargado Comunal ve todos los centros; puede filtrar por uno.
    """
    filas = await EncuestaSatisfaccionService(db).reporte(establecimiento_id)
    return [EncuestaReporteItem(**fila) for fila in filas]


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
