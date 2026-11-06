# Diccionario de datos — Sistema OIRS

**Departamento de Salud Municipal de Padre Las Casas**
Modelo relacional (ACID/RBAC) + documental (JSONB).

Arquitectura **multi-sede**: una sola base de datos y un solo esquema; los
centros se discriminan con `id_establecimiento`. No es multi-tenancy por
esquema ni por base.

> `fecha_limite` se calcula en la capa de servicio (15 días hábiles,
> Ley N° 20.584), no mediante trigger, para mantener la lógica de feriados
> fuera de la base de datos.

---

## 1. `rol`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_rol` | `SERIAL` | PK | Identificador del rol |
| `nombre_rol` | `VARCHAR(50)` | UNIQUE, NOT NULL | Nombre del rol |
| `descripcion` | `VARCHAR(255)` | — | Descripción del perfil |

**Propósito:** define los perfiles de acceso de los funcionarios en el modelo
de seguridad RBAC.

Roles base: *Administrador del Sistema*, *Encargado OIRS Comunal*,
*Funcionario Local*.

---

## 2. `establecimiento`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_establecimiento` | `SERIAL` | PK | Identificador del centro |
| `nombre_centro` | `VARCHAR(120)` | NOT NULL | Nombre del centro |
| `tipo_centro` | `VARCHAR(60)` | NOT NULL | Tipo (CESFAM, CECOSF, etc.) |

**Propósito:** almacena los centros de salud de la red municipal. Es la
dimensión que discrimina los datos entre sedes.

---

## 3. `usuario`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_usuario` | `SERIAL` | PK | Identificador del usuario |
| `rut` | `VARCHAR(12)` | UNIQUE, NOT NULL | RUT del funcionario |
| `nombre` | `VARCHAR(120)` | NOT NULL | Nombre completo |
| `email` | `VARCHAR(120)` | UNIQUE, NOT NULL | Correo institucional |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Hash argon2 de la contraseña |
| `id_rol` | `INT` | FK → `rol`, NOT NULL | Rol asignado |
| `id_establecimiento` | `INT` | FK → `establecimiento`, NOT NULL | Centro base del usuario |

**Propósito:** registra el personal administrativo y de salud autenticado, con
su rol y centro base.

**RBAC multi-sede:** el centro es el *centro base*. Los roles con alcance
global (`Administrador del Sistema`, `Encargado OIRS Comunal`) pueden operar
sobre cualquier establecimiento; `Funcionario Local` solo sobre el suyo.

---

## 4. `requerimiento_oirs`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_requerimiento` | `SERIAL` | PK | Identificador interno |
| `codigo_seguimiento` | `VARCHAR(20)` | UNIQUE, NOT NULL | Código para consulta pública |
| `tipo_solicitud` | `VARCHAR(30)` | NOT NULL | Tipo de solicitud |
| `detalle_solicitud` | `TEXT` | NOT NULL | Detalle; puede incluir datos de contacto voluntarios |
| `estado` | `VARCHAR(30)` | NOT NULL, DEFAULT `'Ingresado'`, CHECK | Estado del caso |
| `fecha_ingreso` | `DATE` | NOT NULL, DEFAULT `CURRENT_DATE` | Fecha de ingreso |
| `fecha_limite` | `DATE` | NOT NULL | Calculada: ingreso + 15 días hábiles |
| `es_anonimo` | `BOOLEAN` | NOT NULL, DEFAULT `FALSE` | Indica si no se dejaron datos de contacto |
| `id_establecimiento` | `INT` | FK → `establecimiento`, NOT NULL | Centro que recibe el caso |

**Estados válidos:** `Ingresado`, `En Proceso`, `Respondido`, `Cerrado`,
`Rechazado`.

**Privacidad:** el ciudadano puede incluir voluntariamente nombre, RUT o email
en `detalle_solicitud`. Por eso la **consulta pública por código nunca expone
`detalle_solicitud`**.

---

## 5. `auditoria_log`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_log` | `BIGSERIAL` | PK | Identificador del evento |
| `id_usuario` | `INT` | FK → `usuario`, `ON DELETE SET NULL` | Usuario que ejecutó la acción |
| `id_establecimiento` | `INT` | FK → `establecimiento`, `ON DELETE SET NULL` | Centro donde ocurrió la acción |
| `accion` | `VARCHAR(150)` | NOT NULL | Acción registrada |
| `timestamp` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Fecha y hora del evento |
| `ip_origen` | `INET` | — | IP de origen |

**Propósito:** registro inalterable de las transacciones de los usuarios.

**Reglas de integridad:**

- **Append-only:** el trigger `trg_auditoria_append_only` bloquea `UPDATE` y
  `DELETE`, incluso por SQL directo. La única excepción es la nulificación de
  `id_usuario` / `id_establecimiento` producida por `ON DELETE SET NULL`.
- `ON DELETE SET NULL` en las FK: el historial sobrevive a la baja de un
  usuario o establecimiento.
- El cambio de estado de un requerimiento y su log se escriben en la **misma
  transacción**.
- Convención de `accion`: `CAMBIO_ESTADO req=<id> <anterior>-><nuevo>`.

---

## 6. `encuesta_satisfaccion`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_encuesta` | `SERIAL` | PK | Identificador de la encuesta |
| `id_establecimiento` | `INT` | FK → `establecimiento`, NOT NULL | Centro evaluado |
| `fecha_respuesta` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Fecha de respuesta |
| `datos_documento` | `JSONB` | NOT NULL, CHECK `jsonb_typeof = 'object'` | Calificaciones y comentarios |

**Propósito:** almacenamiento documental flexible de evaluaciones ciudadanas
anónimas (Ley N° 19.628). No referencia a `usuario`.

**Estructura sugerida de `datos_documento`:**

```json
{
  "trato": 7,
  "tiempo_espera": 5,
  "calidad": 6,
  "comentario": "texto libre"
}
```

**Índices:** GIN sobre `datos_documento` para consultas de métricas y
analítica.

---

## Reglas de integridad transversales

1. **Claves primarias** en las 6 entidades.
2. **Claves foráneas** con `ON DELETE RESTRICT` por defecto; auditoría usa
   `SET NULL` para preservar el historial.
3. **UNIQUE** en `rol.nombre_rol`, `usuario.rut`, `usuario.email` y
   `requerimiento_oirs.codigo_seguimiento`.
4. **CHECK** en `requerimiento_oirs.estado` y en el tipo de `datos_documento`.
5. **Índices** en todas las FK y en `(estado, fecha_ingreso)` para reportes
   consolidados por centro.
6. **Append-only** en auditoría mediante trigger.
7. **Aislamiento por sede** garantizado en la capa de aplicación (RBAC); puede
   reforzarse con RLS en el futuro.
