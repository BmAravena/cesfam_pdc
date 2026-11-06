"""Repositorios de acceso a datos."""

from backend.db.repositories.base import BaseRepository
from backend.db.repositories.establecimiento_repo import EstablecimientoRepository
from backend.db.repositories.rol_repo import RolRepository
from backend.db.repositories.usuario_repo import UsuarioRepository

__all__ = [
    "BaseRepository",
    "EstablecimientoRepository",
    "RolRepository",
    "UsuarioRepository",
]
