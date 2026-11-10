"""agregar establecimientos adicionales

Revision ID: 10752746fbd4
Revises: 0002_seed_base
Create Date: 2026-11-10 16:37:18.665856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10752746fbd4'
down_revision: Union[str, Sequence[str], None] = '0002_seed_base'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega los CESFAM adicionales de la comuna.

    No se especifica `id_establecimiento` para que Postgres use la secuencia
    y no choque con el CESFAM Padre Las Casas ya existente.
    """
    op.execute(
        """
        INSERT INTO establecimiento (nombre_centro, tipo_centro)
        SELECT v.nombre_centro, v.tipo_centro
        FROM (VALUES
            ('CESFAM Las Colinas', 'CESFAM Urbano'),
            ('CESFAM Pulmahue', 'CESFAM Urbano'),
            ('CESFAM Conun Huenu', 'CESFAM Urbano')
        ) AS v(nombre_centro, tipo_centro)
        WHERE NOT EXISTS (
            SELECT 1
            FROM establecimiento e
            WHERE e.nombre_centro = v.nombre_centro
        )
        """
    )


def downgrade() -> None:
    """Elimina los establecimientos agregados por esta migración.

    Si alguno ya tiene usuarios o requerimientos asociados, la FK impedirá
    el borrado y la reversión fallará (evita pérdida de datos).
    """
    op.execute(
        """
        DELETE FROM establecimiento
        WHERE nombre_centro IN (
            'CESFAM Las Colinas',
            'CESFAM Pulmahue',
            'CESFAM Conun Huenu'
        )
        """
    )
