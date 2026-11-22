"""Catálogo de establecimientos de la red de salud municipal."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.establecimiento import (
    EstablecimientoCreate,
    EstablecimientoResponse,
    EstablecimientoUpdate,
)
from backend.core.security import require_roles
from backend.db.models.usuario import Usuario
from backend.db.session import get_db
from backend.services.authz import ROL_ADMIN
from backend.services.establecimiento_service import EstablecimientoService

router = APIRouter(prefix="/establecimientos", tags=["establecimientos"])


@router.get(
    "",
    response_model=list[EstablecimientoResponse],
    summary="Listar establecimientos",
)
async def listar_establecimientos(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[EstablecimientoResponse]:
    return await EstablecimientoService(db).get_all(skip=skip, limit=limit)


@router.post(
    "",
    response_model=EstablecimientoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un establecimiento (solo Administrador)",
)
async def crear_establecimiento(
    data: EstablecimientoCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN))],
) -> EstablecimientoResponse:
    return await EstablecimientoService(db).create(data)


@router.patch(
    "/{establecimiento_id}",
    response_model=EstablecimientoResponse,
    summary="Actualizar un establecimiento (solo Administrador)",
)
async def actualizar_establecimiento(
    establecimiento_id: int,
    data: EstablecimientoUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN))],
) -> EstablecimientoResponse:
    return await EstablecimientoService(db).update(establecimiento_id, data)


@router.delete(
    "/{establecimiento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un establecimiento sin datos asociados (solo Administrador)",
)
async def eliminar_establecimiento(
    establecimiento_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Usuario, Depends(require_roles(ROL_ADMIN))],
) -> None:
    await EstablecimientoService(db).delete(establecimiento_id)
