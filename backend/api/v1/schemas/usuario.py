from datetime import datetime

from pydantic import EmailStr, Field

from backend.api.v1.schemas.common import ORMModel

# RUT chileno: 12345678-9, 12.345.678-9, 12345678-K
RUT_PATTERN = r"^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$"


class UsuarioBase(ORMModel):
    rut: str = Field(min_length=8, max_length=12, pattern=RUT_PATTERN)
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    id_rol: int = Field(gt=0)
    id_establecimiento: int = Field(gt=0)


class UsuarioCreate(UsuarioBase):
    # Contraseña en claro solo en la entrada; se hashea en el servicio.
    password: str = Field(min_length=8, max_length=128)


class UsuarioUpdate(ORMModel):
    rut: str | None = Field(default=None, min_length=8, max_length=12, pattern=RUT_PATTERN)
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    id_rol: int | None = Field(default=None, gt=0)
    id_establecimiento: int | None = Field(default=None, gt=0)
    # Permite reactivar (true) o dar de baja lógica (false) un usuario.
    activo: bool | None = None


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    activo: bool
    fecha_baja: datetime | None
    # Nunca se expone password_hash
