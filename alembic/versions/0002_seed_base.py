"""Datos base: roles del sistema y establecimiento principal.

Réplica de backend/db/scripts/insert.sql, ahora versionado como migración.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_seed_base"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rol (nombre_rol, descripcion) VALUES
        ('Administrador del Sistema', 'Control total de la plataforma y configuraciones.'),
        ('Encargado OIRS Comunal', 'Supervisión y reportes de todos los centros de salud de Padre Las Casas.'),
        ('Funcionario Local', 'Gestión de requerimientos y casos asignados a su establecimiento.')
        ON CONFLICT (nombre_rol) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO establecimiento (nombre_centro, tipo_centro)
        SELECT 'CESFAM Padre Las Casas', 'CESFAM Urbano'
        WHERE NOT EXISTS (
            SELECT 1 FROM establecimiento
            WHERE nombre_centro = 'CESFAM Padre Las Casas'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM establecimiento WHERE nombre_centro = 'CESFAM Padre Las Casas'"
    )
    op.execute(
        """
        DELETE FROM rol
        WHERE nombre_rol IN (
            'Administrador del Sistema',
            'Encargado OIRS Comunal',
            'Funcionario Local'
        )
        """
    )
