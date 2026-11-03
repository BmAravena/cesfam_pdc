from backend.db.session import Base

# 2. Importamos todos los modelos para que se registren en Base.metadata
from backend.db.models import (
    AuditoriaLog,
    EncuestaSatisfaccion,
    Establecimiento,
    RequerimientoOirs,
    Rol,
    Usuario,
)

__all__ = [
    "AuditoriaLog",
    "Base",
    "EncuestaSatisfaccion",
    "Establecimiento",
    "RequerimientoOirs",
    "Rol",
    "Usuario",
]
