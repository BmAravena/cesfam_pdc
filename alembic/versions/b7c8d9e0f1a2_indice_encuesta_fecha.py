"""índice compuesto para reportes de satisfacción por centro y fecha

Revision ID: b7c8d9e0f1a2
Revises: e5f1a2b3c4d6
Create Date: 2026-11-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "e5f1a2b3c4d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "idx_encuesta_establecimiento_fecha",
        "encuesta_satisfaccion",
        ["id_establecimiento", "fecha_respuesta"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_encuesta_establecimiento_fecha",
        table_name="encuesta_satisfaccion",
    )
