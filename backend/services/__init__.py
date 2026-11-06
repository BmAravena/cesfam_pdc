"""Servicios de negocio (un servicio por entidad)."""

from backend.services.auditoria_log_service import AuditoriaLogService
from backend.core.security import hash_password, verify_password
from backend.services.authz import (
    ROL_ADMIN,
    ROL_COMUNAL,
    ROL_LOCAL,
    ROLES_ALCANCE_GLOBAL,
    puede_acceder_establecimiento,
    tiene_alcance_global,
)
from backend.services.encuesta_satisfaccion_service import (
    EncuestaSatisfaccionService,
)
from backend.services.establecimiento_service import EstablecimientoService
from backend.services.requerimiento_oirs_service import (
    RequerimientoOirsService,
    sumar_dias_habiles,
)
from backend.services.rol_service import RolService
from backend.services.usuario_service import UsuarioService

__all__ = [
    "AuditoriaLogService",
    "EncuestaSatisfaccionService",
    "EstablecimientoService",
    "ROL_ADMIN",
    "ROL_COMUNAL",
    "ROL_LOCAL",
    "ROLES_ALCANCE_GLOBAL",
    "RequerimientoOirsService",
    "RolService",
    "UsuarioService",
    "hash_password",
    "puede_acceder_establecimiento",
    "sumar_dias_habiles",
    "tiene_alcance_global",
    "verify_password",
]
