"""Autenticación: hashing de contraseñas y JWT.

La autorización por roles (RBAC multi-sede) vive en `backend/services/authz.py`.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.db.models.usuario import Usuario
from backend.db.repositories.usuario_repo import UsuarioRepository
from backend.db.session import get_db

ph = PasswordHasher()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No se pudieron validar las credenciales",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    """Recibe la contraseña en claro y devuelve el hash argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara la contraseña en claro contra el hash almacenado."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """Crea un JWT con expiración. El sujeto debe ir en `sub`."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decodifica y valida el JWT. Lanza 401 si es inválido o expiró."""
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        raise CREDENTIALS_EXCEPTION from exc


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Usuario:
    """Dependencia de FastAPI: resuelve el usuario autenticado desde el JWT."""
    payload = decode_access_token(token)
    subject = payload.get("sub")
    if subject is None:
        raise CREDENTIALS_EXCEPTION
    try:
        usuario_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise CREDENTIALS_EXCEPTION from exc

    usuario = await UsuarioRepository(db).get(usuario_id)
    if usuario is None or not usuario.activo:
        raise CREDENTIALS_EXCEPTION
    return usuario


def require_roles(*roles: str):
    """Dependencia que exige que el usuario tenga uno de los roles dados."""

    async def role_checker(
        usuario: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        if usuario.rol.nombre_rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta operación",
            )
        return usuario

    return role_checker
