"""Schemas Pydantic de la API v1."""

from backend.api.v1.schemas.auditoria_log import AuditoriaLogCreate, AuditoriaLogResponse
from backend.api.v1.schemas.common import ORMModel
from backend.api.v1.schemas.encuesta_satisfaccion import (
    EncuestaSatisfaccionCreate,
    EncuestaSatisfaccionResponse,
)
from backend.api.v1.schemas.establecimiento import (
    EstablecimientoBase,
    EstablecimientoCreate,
    EstablecimientoResponse,
    EstablecimientoUpdate,
)
from backend.api.v1.schemas.requerimiento_oirs import (
    EstadoRequerimiento,
    RequerimientoOirsBase,
    RequerimientoOirsCreate,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsResponse,
    RequerimientoOirsUpdate,
)
from backend.api.v1.schemas.rol import RolBase, RolCreate, RolResponse, RolUpdate
from backend.api.v1.schemas.usuario import (
    UsuarioBase,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

__all__ = [
    "AuditoriaLogCreate",
    "AuditoriaLogResponse",
    "EncuestaSatisfaccionCreate",
    "EncuestaSatisfaccionResponse",
    "EstadoRequerimiento",
    "EstablecimientoBase",
    "EstablecimientoCreate",
    "EstablecimientoResponse",
    "EstablecimientoUpdate",
    "ORMModel",
    "RequerimientoOirsBase",
    "RequerimientoOirsCreate",
    "RequerimientoOirsPublicoResponse",
    "RequerimientoOirsResponse",
    "RequerimientoOirsUpdate",
    "RolBase",
    "RolCreate",
    "RolResponse",
    "RolUpdate",
    "UsuarioBase",
    "UsuarioCreate",
    "UsuarioResponse",
    "UsuarioUpdate",
]
