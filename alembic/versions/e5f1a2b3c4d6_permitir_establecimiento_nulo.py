"""permitir id_establecimiento nulo para roles globales

El Administrador del Sistema y el Encargado OIRS Comunal tienen alcance sobre
todas las sedes, por lo que no deben quedar amarrados a un establecimiento.
Solo el Funcionario Local requiere uno.

Revision ID: e5f1a2b3c4d6
Revises: 943ca7222aa1
Create Date: 2026-11-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5f1a2b3c4d6"
down_revision: Union[str, Sequence[str], None] = "943ca7222aa1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "usuario",
        "id_establecimiento",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    # Requiere que no existan usuarios con id_establecimiento NULL.
    op.alter_column(
        "usuario",
        "id_establecimiento",
        existing_type=sa.Integer(),
        nullable=False,
    )
