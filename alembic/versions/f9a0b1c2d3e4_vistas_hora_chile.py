"""vistas de lectura con fechas en horario de Chile

Las tablas guardan los instantes en UTC (``timestamptz``), que es lo correcto.
El Table Editor de Supabase siempre muestra esa columna en UTC, así que estas
vistas permiten inspeccionar los mismos datos con la hora local de Chile sin
modificar las tablas ni los datos almacenados.

Revision ID: f9a0b1c2d3e4
Revises: b7c8d9e0f1a2
Create Date: 2026-11-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS requerimientos_hora_chile")
    op.execute(
        """
        CREATE VIEW requerimientos_hora_chile AS
        SELECT
            id_requerimiento,
            codigo_seguimiento,
            tipo_solicitud,
            detalle_solicitud,
            estado,
            respuesta,
            fecha_respuesta AT TIME ZONE 'America/Santiago'
                AS fecha_respuesta_chile,
            fecha_ingreso,
            fecha_limite,
            es_anonimo,
            id_establecimiento
        FROM requerimiento_oirs
        """
    )

    op.execute("DROP VIEW IF EXISTS auditoria_hora_chile")
    op.execute(
        """
        CREATE VIEW auditoria_hora_chile AS
        SELECT
            id_log,
            id_usuario,
            id_establecimiento,
            accion,
            timestamp AT TIME ZONE 'America/Santiago' AS timestamp_chile,
            ip_origen
        FROM auditoria_log
        """
    )

    op.execute("DROP VIEW IF EXISTS encuestas_hora_chile")
    op.execute(
        """
        CREATE VIEW encuestas_hora_chile AS
        SELECT
            id_encuesta,
            id_establecimiento,
            datos_documento,
            fecha_respuesta AT TIME ZONE 'America/Santiago'
                AS fecha_respuesta_chile
        FROM encuesta_satisfaccion
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS encuestas_hora_chile")
    op.execute("DROP VIEW IF EXISTS auditoria_hora_chile")
    op.execute("DROP VIEW IF EXISTS requerimientos_hora_chile")
