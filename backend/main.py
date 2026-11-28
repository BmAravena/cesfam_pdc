"""Punto de entrada de la API OIRS de CESFAM Padre Las Casas."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from backend.api.v1.router import api_router
from backend.core.config import settings
from backend.db.session import close_db
from backend.services.exceptions import (
    BusinessRuleError,
    ConflictError,
    NotFoundError,
    PermissionDenied,
    ServiceError,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    # Documentación técnica bajo el prefijo de la API. Nginx solo reenvía
    # /api/ al backend, así que estas rutas funcionan a través del proxy.
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["raíz"], summary="Información de la API")
async def raiz() -> dict[str, str]:
    return {"nombre": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/health", tags=["raíz"], summary="Estado del servicio")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Traducción de excepciones de negocio a respuestas HTTP ---


def _error_response(exc: ServiceError, status_code: int) -> JSONResponse:
    content: dict[str, str] = {"detail": str(exc)}
    if exc.campo:
        content["campo"] = exc.campo
    return JSONResponse(status_code=status_code, content=content)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return _error_response(exc, status.HTTP_404_NOT_FOUND)


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return _error_response(exc, status.HTTP_400_BAD_REQUEST)


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(request: Request, exc: BusinessRuleError):
    return _error_response(exc, status.HTTP_400_BAD_REQUEST)


@app.exception_handler(PermissionDenied)
async def permission_denied_handler(request: Request, exc: PermissionDenied):
    return _error_response(exc, status.HTTP_403_FORBIDDEN)
