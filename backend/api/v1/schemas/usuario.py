import re
from datetime import datetime
from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError

from backend.api.v1.schemas.common import ORMModel
from backend.core.rut import RutInvalido, validar_rut


def _normalizar_email_entrada(value: str) -> str:
    """Valida el formato y normaliza, con un mensaje de error en español.

    No consulta DNS: la verificación de MX/A se hace en el servicio porque
    es una operación de red asíncrona.
    """
    try:
        return validate_email(value, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise PydanticCustomError(
            "email_invalido",
            "Ingresa un correo electrónico válido (ejemplo: nombre@dominio.cl).",
        ) from exc


# Tipo solo para entradas: el response usa EmailStr para no fallar al
# serializar correos antiguos.
EmailEntrada = Annotated[str, AfterValidator(_normalizar_email_entrada)]


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
    # Sin pattern aquí: UsuarioResponse también hereda este campo y no debe
    # fallar al serializar RUT antiguos que no cumplan la regla actual.
    rut: str
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    id_rol: int = Field(gt=0)
    #id_establecimiento: int = Field(gt=0)


class UsuarioCreate(UsuarioBase):
    rut: str
    # Se revalida aquí para entregar un mensaje de formato en español.
    email: EmailEntrada
    id_establecimiento: int | None = Field(default=None, gt=0)
    # Contraseña en claro solo en la entrada; se hashea en el servicio.
    password: str = Field(min_length=8, max_length=128)

    @field_validator("rut")
    @classmethod
    def validar_rut_chileno(cls, value: str) -> str:
        try:
            return validar_rut(value)
        except RutInvalido as exc:
            raise PydanticCustomError("rut_invalido", str(exc)) from exc

    @field_validator("password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return _validar_fortaleza_password(value)


class UsuarioUpdate(ORMModel):
    # La validación se hace en el servicio solo si el RUT cambia, para no
    # bloquear usuarios antiguos cuyo RUT no cumpla la regla actual.
    rut: str | None = None
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailEntrada | None = None
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
