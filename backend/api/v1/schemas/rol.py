from pydantic import Field

from backend.api.v1.schemas.common import ORMModel


class RolBase(ORMModel):
    nombre_rol: str = Field(min_length=1, max_length=50)
    descripcion: str | None = Field(default=None, max_length=255)


class RolCreate(RolBase):
    pass


class RolUpdate(ORMModel):
    nombre_rol: str | None = Field(default=None, min_length=1, max_length=50)
    descripcion: str | None = Field(default=None, max_length=255)


class RolResponse(RolBase):
    id_rol: int
