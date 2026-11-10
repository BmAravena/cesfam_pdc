"""Agregador de endpoints de la API v1."""

from fastapi import APIRouter

from backend.api.v1.endpoints import (
    auditoria,
    auth,
    encuestas,
    establecimientos,
    requerimientos,
    usuarios,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(requerimientos.router)
api_router.include_router(establecimientos.router)
api_router.include_router(encuestas.router)
api_router.include_router(auditoria.router)
