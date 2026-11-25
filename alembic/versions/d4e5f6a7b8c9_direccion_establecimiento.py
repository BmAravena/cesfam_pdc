"""agregar direccion a establecimiento y cargar direcciones

Revision ID: d4e5f6a7b8c9
Revises: f9a0b1c2d3e4
Create Date: 2026-11-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "establecimiento",
        sa.Column("direccion", sa.String(length=200), nullable=True),
    )

    op.execute(
        """
        UPDATE establecimiento AS e
        SET direccion = v.direccion
        FROM (VALUES
            ('CESFAM Padre Las Casas', 'Almte. Barroso 365, 4851202 Padre las Casas, Padre Las Casas, Araucanía'),
            ('CESFAM Las Colinas', 'Manil 130, 4850713 Padre las Casas, Padre Las Casas, Araucanía'),
            ('CESFAM Conun Huenu', 'Av. Pulmahue 1300-1398, Padre las Casas, Padre Las Casas, Araucanía'),
            ('CESFAM Pulmahue', 'Av. La Quebrada 1419, 4851622 Padre las Casas, Padre Las Casas, Araucanía')
        ) AS v(nombre_centro, direccion)
        WHERE e.nombre_centro = v.nombre_centro
        """
    )


def downgrade() -> None:
    op.drop_column("establecimiento", "direccion")
