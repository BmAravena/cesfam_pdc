"""Configuración de Alembic para SQLAlchemy async + asyncpg.

La URL de conexión se obtiene de `DATABASE_URL_POSTGRES` mediante
`backend.core.config.settings`, por lo que no hay credenciales en alembic.ini.

Variables opcionales:
- `ALEMBIC_SCHEMA`: ejecuta las migraciones en un esquema específico en vez de
  `public`. Útil para pruebas de integración o entornos aislados.
"""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import backend.db.models  # noqa: F401  registra todas las tablas en Base.metadata
from backend.core.config import settings
from backend.db.session import Base, build_database_url

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url, uses_pgbouncer = build_database_url(settings.DATABASE_URL_POSTGRES)
schema = os.getenv("ALEMBIC_SCHEMA") or None

connect_args: dict = {}
if uses_pgbouncer:
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
if schema:
    connect_args.setdefault("server_settings", {})["search_path"] = (
        f'"{schema}",public'
    )

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to) -> bool:
    """Evita que `alembic check` vea su propia tabla de versiones."""
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def run_migrations_offline() -> None:
    """Genera SQL sin conectarse a la base (útil para revisar la migración)."""
    context.configure(
        url=database_url.render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        version_table_schema=schema,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        version_table_schema=schema,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Crea un engine async temporal para ejecutar las migraciones."""
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
