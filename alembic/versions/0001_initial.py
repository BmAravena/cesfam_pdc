"""Migración inicial: esquema completo del sistema OIRS.

Crea las 6 tablas, sus constraints, índices y el trigger append-only de
auditoria_log. Generada manualmente a partir de los modelos SQLAlchemy.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rol",
        sa.Column("id_rol", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre_rol", sa.String(length=50), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id_rol"),
        sa.UniqueConstraint("nombre_rol"),
    )

    op.create_table(
        "establecimiento",
        sa.Column(
            "id_establecimiento", sa.Integer(), autoincrement=True, nullable=False
        ),
        sa.Column("nombre_centro", sa.String(length=120), nullable=False),
        sa.Column("tipo_centro", sa.String(length=60), nullable=False),
        sa.PrimaryKeyConstraint("id_establecimiento"),
    )

    op.create_table(
        "usuario",
        sa.Column("id_usuario", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rut", sa.String(length=12), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("id_rol", sa.Integer(), nullable=False),
        sa.Column("id_establecimiento", sa.Integer(), nullable=False),
        sa.Column(
            "activo",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("fecha_baja", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["id_rol"], ["rol.id_rol"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["id_establecimiento"],
            ["establecimiento.id_establecimiento"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id_usuario"),
        sa.UniqueConstraint("rut"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "requerimiento_oirs",
        sa.Column(
            "id_requerimiento", sa.Integer(), autoincrement=True, nullable=False
        ),
        sa.Column("codigo_seguimiento", sa.String(length=20), nullable=False),
        sa.Column("tipo_solicitud", sa.String(length=30), nullable=False),
        sa.Column("detalle_solicitud", sa.Text(), nullable=False),
        sa.Column(
            "estado",
            sa.String(length=30),
            server_default=sa.text("'Ingresado'"),
            nullable=False,
        ),
        sa.Column(
            "fecha_ingreso",
            sa.Date(),
            server_default=sa.text("CURRENT_DATE"),
            nullable=False,
        ),
        sa.Column("fecha_limite", sa.Date(), nullable=False),
        sa.Column(
            "es_anonimo",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("id_establecimiento", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "estado IN ('Ingresado', 'En Proceso', 'Respondido', 'Cerrado', 'Rechazado')",
            name="ck_requerimiento_oirs_estado",
        ),
        sa.ForeignKeyConstraint(
            ["id_establecimiento"],
            ["establecimiento.id_establecimiento"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id_requerimiento"),
        sa.UniqueConstraint("codigo_seguimiento"),
    )

    op.create_table(
        "auditoria_log",
        sa.Column("id_log", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("id_establecimiento", sa.Integer(), nullable=True),
        sa.Column("accion", sa.String(length=150), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ip_origen", postgresql.INET(), nullable=True),
        sa.ForeignKeyConstraint(
            ["id_usuario"], ["usuario.id_usuario"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["id_establecimiento"],
            ["establecimiento.id_establecimiento"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id_log"),
    )

    op.create_table(
        "encuesta_satisfaccion",
        sa.Column("id_encuesta", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_establecimiento", sa.Integer(), nullable=False),
        sa.Column(
            "fecha_respuesta",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("datos_documento", postgresql.JSONB(), nullable=False),
        sa.CheckConstraint(
            "jsonb_typeof(datos_documento) = 'object'",
            name="ck_encuesta_datos_object",
        ),
        sa.ForeignKeyConstraint(
            ["id_establecimiento"],
            ["establecimiento.id_establecimiento"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id_encuesta"),
    )

    op.create_index("idx_usuario_rol", "usuario", ["id_rol"])
    op.create_index(
        "idx_usuario_establecimiento", "usuario", ["id_establecimiento"]
    )
    op.create_index(
        "idx_req_establecimiento", "requerimiento_oirs", ["id_establecimiento"]
    )
    op.create_index(
        "idx_req_estado_fecha",
        "requerimiento_oirs",
        ["estado", "fecha_ingreso"],
    )
    op.create_index(
        "idx_encuesta_establecimiento",
        "encuesta_satisfaccion",
        ["id_establecimiento"],
    )
    op.create_index("idx_auditoria_usuario", "auditoria_log", ["id_usuario"])
    op.create_index(
        "idx_auditoria_establecimiento",
        "auditoria_log",
        ["id_establecimiento"],
    )
    op.create_index("idx_auditoria_timestamp", "auditoria_log", ["timestamp"])
    op.create_index(
        "idx_gin_encuesta_datos",
        "encuesta_satisfaccion",
        ["datos_documento"],
        postgresql_using="gin",
    )

    # Auditoría append-only: bloquea UPDATE y DELETE a nivel de base.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_auditoria_append_only() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'auditoria_log es append-only: no se permite DELETE';
            END IF;

            -- Excepción: ON DELETE SET NULL de las FK.
            IF NEW.id_log = OLD.id_log
               AND NEW.accion = OLD.accion
               AND NEW.timestamp = OLD.timestamp
               AND NEW.ip_origen IS NOT DISTINCT FROM OLD.ip_origen
            THEN
                RETURN NEW;
            END IF;

            RAISE EXCEPTION 'auditoria_log es append-only: no se permite UPDATE';
        END;
        $$;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_auditoria_append_only
        BEFORE UPDATE OR DELETE ON auditoria_log
        FOR EACH ROW EXECUTE FUNCTION fn_auditoria_append_only();
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_auditoria_append_only ON auditoria_log"
    )
    op.execute("DROP FUNCTION IF EXISTS fn_auditoria_append_only()")

    op.drop_index("idx_gin_encuesta_datos", table_name="encuesta_satisfaccion")
    op.drop_index("idx_auditoria_timestamp", table_name="auditoria_log")
    op.drop_index("idx_auditoria_establecimiento", table_name="auditoria_log")
    op.drop_index("idx_auditoria_usuario", table_name="auditoria_log")
    op.drop_index("idx_encuesta_establecimiento", table_name="encuesta_satisfaccion")
    op.drop_index("idx_req_estado_fecha", table_name="requerimiento_oirs")
    op.drop_index("idx_req_establecimiento", table_name="requerimiento_oirs")
    op.drop_index("idx_usuario_establecimiento", table_name="usuario")
    op.drop_index("idx_usuario_rol", table_name="usuario")

    op.drop_table("encuesta_satisfaccion")
    op.drop_table("auditoria_log")
    op.drop_table("requerimiento_oirs")
    op.drop_table("usuario")
    op.drop_table("establecimiento")
    op.drop_table("rol")
