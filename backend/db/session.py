import asyncio
import sys
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Permite ejecutar el archivo directamente: python backend/db/session.py
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.core.config import settings


def build_database_url(raw_url: str):
    """Adapta la URL de Postgres para que asyncpg la entienda."""
    url = make_url(raw_url)

    # Forzamos el driver async
    if url.get_backend_name() == "postgresql":
        url = url.set(drivername="postgresql+asyncpg")

    query = dict(url.query)

    # asyncpg no acepta "sslmode", usa "ssl"
    if "sslmode" in query:
        query["ssl"] = query.pop("sslmode")

    # pgbouncer=true es un parámetro de Supabase, no de asyncpg
    pgbouncer = str(query.pop("pgbouncer", "")).lower() in ("1", "true", "yes")
    if query:
        url = url.set(query=query)
    else:
        url = url.set(query={})

    return url, pgbouncer


database_url, uses_pgbouncer = build_database_url(settings.DATABASE_URL_POSTGRES)

# En modo transacción (puerto 6543) pgbouncer no soporta prepared statements.
connect_args = {}
if uses_pgbouncer:
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }

engine = create_async_engine(
    database_url,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,  # descarta conexiones muertas antes de usarlas
    pool_recycle=1800,  # el pooler de Supabase corta conexiones ociosas (~30 min)
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# Base declarativa para los modelos (SQLAlchemy 2.x)
class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia de FastAPI: entrega una sesión y garantiza su cierre."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> bool:
    """Hace un SELECT 1 para verificar que la base responde."""
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            connected = result.scalar_one() == 1
    except (SQLAlchemyError, OSError) as exc:
        print(f"Error al conectar con la base de datos: {type(exc).__name__}: {exc}")
        return False

    print("Conexión a la base de datos exitosa.")
    return connected


async def close_db() -> None:
    """Cierra el pool. Llamar al apagar la app (lifespan)."""
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_db_connection())
