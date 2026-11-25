# Migraciones de base de datos (Alembic)

La fuente de verdad del esquema es la carpeta `alembic/versions/`. Los scripts
`backend/db/scripts/create.sql` e `insert.sql` quedan solo como referencia
histórica y **no deben ejecutarse manualmente**.

## Requisitos

```bash
.venv/Scripts/python.exe -m pip install -r requirements.txt
```

La URL de conexión se toma de `DATABASE_URL_POSTGRES` en `.env`. No hay
credenciales en `alembic.ini`.

## Comandos habituales

Aplicar todas las migraciones pendientes:

```bash
.venv/Scripts/python.exe -m alembic upgrade head
```

Ver la revisión aplicada actualmente:

```bash
.venv/Scripts/python.exe -m alembic current
```

Ver el historial:

```bash
.venv/Scripts/python.exe -m alembic history --verbose
```

Crear una migración después de cambiar los modelos:

```bash
.venv/Scripts/python.exe -m alembic revision --autogenerate -m "descripcion del cambio"
```

Revisar siempre el archivo generado antes de aplicarlo. Alembic no detecta
cambios en triggers, funciones ni tipos personalizados; esos deben agregarse
manualmente con `op.execute(...)`.

Aplicar esa migración:

```bash
.venv/Scripts/python.exe -m alembic upgrade head
```

Revertir la última migración:

```bash
.venv/Scripts/python.exe -m alembic downgrade -1
```

Revertir todo:

```bash
.venv/Scripts/python.exe -m alembic downgrade base
```

Generar el SQL sin conectarse a la base (útil para revisión):

```bash
.venv/Scripts/python.exe -m alembic upgrade head --sql
```

## Migraciones actuales

| Revisión | Contenido |
|---|---|
| `0001_initial` | Tablas `rol`, `establecimiento`, `usuario`, `requerimiento_oirs`, `auditoria_log`, `encuesta_satisfaccion`; índices, constraints y trigger append-only |
| `0002_seed_base` | Roles base del sistema y CESFAM Padre Las Casas |
| `10752746fbd4` | CESFAM adicionales de la comuna |
| `c4a7e9b1d2f3` | Columnas `respuesta` y `fecha_respuesta` en requerimientos |
| `943ca7222aa1` | Sincronización de esquema con la base en Brasil |
| `e5f1a2b3c4d6` | `usuario.id_establecimiento` nullable para roles globales |
| `b7c8d9e0f1a2` | Índice compuesto por establecimiento y fecha de encuestas |
| `f9a0b1c2d3e4` | Vistas de lectura en horario de Chile |
| `d4e5f6a7b8c9` | `establecimiento.direccion` y carga de direcciones |

## Esquema aislado (pruebas)

La variable `ALEMBIC_SCHEMA` permite ejecutar las migraciones en un esquema
distinto de `public`:

```bash
ALEMBIC_SCHEMA=test_migraciones .venv/Scripts/python.exe -m alembic upgrade head
```

El esquema debe existir previamente. Esto se usa para validar las migraciones
sin tocar los datos reales.
