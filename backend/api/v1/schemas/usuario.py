import re
from datetime import datetime

from pydantic import EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError

from backend.api.v1.schemas.common import ORMModel

# RUT chileno: 12345678-9, 12.345.678-9, 12345678-K
RUT_PATTERN = r"^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$"


def _validar_fortaleza_password(value: str) -> str:
    """Exige al menos una mayúscula y un carácter no alfanumérico.

    Se usa `re` de Python en vez de `Field(pattern=...)` porque el motor de
    regex de Pydantic v2 no soporta look-ahead.
    """
    if not re.search(r"[A-Z]", value):
        raise PydanticCustomError(
            "password_sin_mayuscula",
            "La contraseña debe incluir al menos una letra mayúscula",
        )
    if not re.search(r"[^a-zA-Z0-9]", value):
        raise PydanticCustomError(
            "password_sin_caracter_especial",
            "La contraseña debe incluir al menos un carácter especial",
        )
    return value


class UsuarioBase(ORMModel):
    rut: str = Field(min_length=8, max_length=12, pattern=RUT_PATTERN)
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    id_rol: int = Field(gt=0)
    #id_establecimiento: int = Field(gt=0)


class UsuarioCreate(UsuarioBase):
    id_establecimiento: int | None = Field(default=None, gt=0)
    # Contraseña en claro solo en la entrada; se hashea en el servicio.
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return _validar_fortaleza_password(value)


class UsuarioUpdate(ORMModel):
    rut: str | None = Field(default=None, min_length=8, max_length=12, pattern=RUT_PATTERN)
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    id_rol: int | None = Field(default=None, gt=0)
    id_establecimiento: int | None = Field(default=None, gt=0)
    # Permite reactivar (true) o dar de baja lógica (false) un usuario.
    activo: bool | None = None

    @field_validator("password")
    @classmethod
    def validar_password(cls, value: str | None) -> str | None:
        return None if value is None else _validar_fortaleza_password(value)


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    # Nulo para roles globales (Administrador / Encargado Comunal).
    id_establecimiento: int | None = None
    activo: bool
    fecha_baja: datetime | None
    # Nunca se expone password_hash
