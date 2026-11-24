#!/bin/sh
set -eu

# En un despliegue de una sola instancia, aplicar las migraciones al arrancar
# simplifica el primer despliegue. Para escalar el backend, usar
# RUN_MIGRATIONS=false y ejecutar `alembic upgrade head` una sola vez.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[entrypoint] Aplicando migraciones de Alembic..."
    python -m alembic upgrade head
fi

# Permite ejecutar comandos puntuales:
# docker compose run --rm backend python -m backend.db.scripts.seed_admin ...
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

WORKERS="${WEB_CONCURRENCY:-1}"
FORWARDED_ALLOW_IPS="${FORWARDED_ALLOW_IPS:-*}"

exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "$WORKERS" \
    --proxy-headers \
    --forwarded-allow-ips "$FORWARDED_ALLOW_IPS"
