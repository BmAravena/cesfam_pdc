"""agregar respuesta a requerimientos

Revision ID: c4a7e9b1d2f3
Revises: 10752746fbd4
Create Date: 2026-11-10 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4a7e9b1d2f3"
down_revision: Union[str, Sequence[str], None] = "10752746fbd4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "requerimiento_oirs",
        sa.Column("respuesta", sa.Text(), nullable=True),
    )
    op.add_column(
        "requerimiento_oirs",
        sa.Column("fecha_respuesta", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("requerimiento_oirs", "fecha_respuesta")
    op.drop_column("requerimiento_oirs", "respuesta")
