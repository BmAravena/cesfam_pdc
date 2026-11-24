# Imagen de producción del backend FastAPI.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

# Las dependencias se instalan antes de copiar el código para aprovechar
# la caché de capas de Docker.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Usuario sin privilegios para ejecutar la aplicación.
RUN groupadd --system app \
    && useradd --system --gid app --create-home app

COPY --chown=app:app backend ./backend
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini ./
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh

RUN chmod 755 /usr/local/bin/backend-entrypoint.sh

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read()"

ENTRYPOINT ["backend-entrypoint.sh"]
