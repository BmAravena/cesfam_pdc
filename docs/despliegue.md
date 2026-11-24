# Despliegue con Docker + Nginx

Esta configuración levanta dos contenedores:

```text
web (Nginx)  ──>  backend (FastAPI/Uvicorn)  ──>  PostgreSQL en la nube
```

- **web** sirve el frontend compilado y hace proxy de `/api/` al backend.
- **backend** ejecuta FastAPI con Uvicorn.
- **PostgreSQL** sigue siendo el servicio administrado de la nube; no se
  incluye un contenedor de base de datos.

Solo se publica el puerto de Nginx. El backend queda accesible únicamente
dentro de la red de Docker.

## 1. Requisitos

- Docker Engine o Docker Desktop.
- Docker Compose v2.
- Acceso de red a la base de datos en la nube.
- Un archivo `.env` con las credenciales.

## 2. Configurar variables

Copiar el ejemplo y completar los valores reales:

```bash
cp .env.docker.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.docker.example .env
```

Si ya existe un `.env` con las credenciales reales, **no lo reemplaces**:
conserva tus valores actuales. Las variables opcionales tienen valores por
defecto en `docker-compose.yml`, así que no es obligatorio agregarlas.

Variables principales:

| Variable | Uso |
|---|---|
| `DATABASE_URL_POSTGRES` | URL de PostgreSQL en la nube |
| `SECRET_KEY` | Firma de los JWT; debe ser única y secreta |
| `DATABASE_ECHO` | `true` solo para depurar SQL |
| `HTTP_PORT` | Puerto público de Nginx, por defecto `80` |
| `RUN_MIGRATIONS` | Aplica `alembic upgrade head` al arrancar |
| `WEB_CONCURRENCY` | Workers de Uvicorn, por defecto `1` |
| `FORWARDED_ALLOW_IPS` | IPs de proxy confiables para `X-Forwarded-For` |
| `VITE_API_URL` | URL de API compilada en el frontend |

El archivo `.env` está ignorado por Git y no se copia dentro de las imágenes.

Para generar una clave secreta:

```bash
openssl rand -hex 32
```

## 3. Construir y levantar

```bash
docker compose build
docker compose up -d
```

Comprobar el estado:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f backend
docker compose logs -f web
```

Abrir `http://localhost` o `http://localhost:${HTTP_PORT}`.

## 4. Migraciones

Con `RUN_MIGRATIONS=true`, el entrypoint ejecuta automáticamente:

```bash
python -m alembic upgrade head
```

al iniciar el contenedor del backend.

Para un despliegue controlado, o si se levantan varias réplicas:

1. Poner `RUN_MIGRATIONS=false` en `.env`.
2. Ejecutar las migraciones una sola vez:

```bash
docker compose exec backend python -m alembic upgrade head
```

No conviene ejecutar migraciones simultáneamente desde varias réplicas.

## 5. Crear el administrador inicial

La API exige un administrador ya existente, por lo que el primer usuario se
crea con el script interno:

```bash
docker compose exec -it backend python -m backend.db.scripts.seed_admin \
  --email admin@cesfam.cl \
  --nombre "Administrador OIRS" \
  --rut 11111111-1
```

La contraseña se solicita de forma interactiva.

## 6. Actualizar una instalación

```bash
git pull
docker compose up -d --build
```

El nuevo backend aplica las migraciones pendientes al arrancar, salvo que
`RUN_MIGRATIONS=false`.

Antes de actualizar en producción se recomienda respaldar la base de datos
según el mecanismo del proveedor.

## 7. HTTPS

La configuración incluida sirve HTTP en el puerto `80`. Para un entorno
público se debe agregar TLS, por ejemplo:

- Terminar HTTPS en este mismo Nginx, montando certificados y agregando un
  `server` en el puerto `443` con redirección desde `80`.
- O colocar un proxy inverso delante (Caddy, Traefik, Nginx del host) que
  termine TLS y reenvíe a `http://localhost:80`.

Para datos de salud y solicitudes ciudadanas, HTTPS debe considerarse
obligatorio fuera de una red interna de confianza.

## 8. Notas de operación

### Pool de conexiones

El backend configura `pool_size=5` y `max_overflow=10` por proceso. Cada worker
de Uvicorn crea su propio pool. Si se aumenta `WEB_CONCURRENCY`, hay que
considerar el límite de conexiones del proveedor de base de datos.

### IP de auditoría

La auditoría y los requerimientos guardan `request.client.host`. Nginx envía
`X-Forwarded-For`, y Uvicorn arranca con `--proxy-headers`, por lo que se
registra la IP real del cliente.

No publicar el puerto `8000` del backend: `FORWARDED_ALLOW_IPS=*` confía en las
cabeceras del proxy interno.

### Logs de Docker

Los logs quedan disponibles con `docker compose logs`. Si el volumen de logs
crece demasiado, configurar rotación en el daemon de Docker o en el servicio
de Compose.

### Reinicio del backend

Nginx usa el resolver interno de Docker y vuelve a resolver el nombre
`backend`, por lo que no debería quedar apuntando a una IP antigua cuando el
contenedor se recrea.

## 9. Diagnóstico rápido

| Síntoma | Revisión |
|---|---|
| Nginx responde `502` | `docker compose logs backend`; backend unhealthy o migración fallida |
| `relation ... does not exist` | Ejecutar migraciones |
| `port is already allocated` | Cambiar `HTTP_PORT` en `.env` |
| Error de conexión a la base | Revisar `DATABASE_URL_POSTGRES`, SSL y acceso saliente |
| No inicia el backend | `docker compose logs backend`; validar `SECRET_KEY` y migraciones |
| Entrada `/api/` devuelve 404 | Confirmar que la ruta empieza con `/api/v1` |
| El frontend muestra 404 al recargar | Revisar `try_files ... /index.html` en `frontend/nginx.conf` |
| IP incorrecta en auditoría | Confirmar que se usa Nginx y no se publicó el backend directamente |
