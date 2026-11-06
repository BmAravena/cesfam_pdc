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
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["raíz"], summary="Información de la API")
async def raiz() -> dict[str, str]:
    return {"nombre": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/health", tags=["raíz"], summary="Estado del servicio")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Traducción de excepciones de negocio a respuestas HTTP ---


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(request: Request, exc: BusinessRuleError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(PermissionDenied)
async def permission_denied_handler(request: Request, exc: PermissionDenied):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": str(exc)},
    )
