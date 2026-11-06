"""Repositorios de acceso a datos."""

from backend.db.repositories.auditoria_log_repo import AuditoriaLogRepository
from backend.db.repositories.base import BaseRepository
from backend.db.repositories.encuesta_satisfaccion_repo import (
    EncuestaSatisfaccionRepository,
)
from backend.db.repositories.establecimiento_repo import EstablecimientoRepository
from backend.db.repositories.requerimiento_oirs_repo import RequerimientoOirsRepository
from backend.db.repositories.rol_repo import RolRepository
from backend.db.repositories.usuario_repo import UsuarioRepository

__all__ = [
    "AuditoriaLogRepository",
    "BaseRepository",
    "EncuestaSatisfaccionRepository",
    "EstablecimientoRepository",
    "RequerimientoOirsRepository",
    "RolRepository",
    "UsuarioRepository",
]
