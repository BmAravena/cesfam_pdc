"""Autenticación y perfil del usuario autenticado."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.token import Token
from backend.core.security import create_access_token
from backend.db.session import get_db
from backend.services.usuario_service import UsuarioService

router = APIRouter(tags=["autenticación"])


@router.post("/auth/login", response_model=Token, summary="Iniciar sesión")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    """Valida las credenciales y entrega un JWT con el contexto del usuario.

    El token incluye `id_usuario`, `id_rol`, `rol` e `id_establecimiento`
    para que la autorización multi-sede no dependa de consultas extra.
    """
    usuario = await UsuarioService(db).authenticate(
        form_data.username, form_data.password
    )
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        {
            "sub": str(usuario.id_usuario),
            "id_usuario": usuario.id_usuario,
            "id_rol": usuario.id_rol,
            "id_establecimiento": usuario.id_establecimiento,
            "rol": usuario.rol.nombre_rol,
        }
    )
    return Token(access_token=access_token)
