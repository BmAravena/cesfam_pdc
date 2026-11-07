-- =========================================================================
-- SISTEMA OIRS - SALUD PADRE LAS CASAS
-- Script DDL basado en el Modelo de Datos Relacional (ACID/RBAC) + Documental (JSONB)
--
-- Nota: fecha_limite NO se calcula con trigger. Se calcula en la capa de
-- servicio (15 días hábiles, Ley N° 20.584), para no cargar la base de datos
-- con la lógica de feriados chilenos.
-- =========================================================================

-- 1. Tabla: rol (Control de Acceso Basado en Roles - RBAC)
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
);

-- 2. Tabla: establecimiento (Centros de salud de la red municipal: CESFAM, CECOSF)
CREATE TABLE establecimiento (
    id_establecimiento SERIAL PRIMARY KEY,
    nombre_centro VARCHAR(120) NOT NULL,
    tipo_centro VARCHAR(60) NOT NULL
);

-- 3. Tabla: usuario (Personal administrativo y de salud)
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL REFERENCES rol(id_rol) ON DELETE RESTRICT,
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento) ON DELETE RESTRICT,
    -- Borrado lógico: el usuario se conserva para mantener la trazabilidad
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_baja TIMESTAMPTZ
);

-- 4. Tabla: requerimiento_oirs (Solicitudes ciudadanas con plazo legal de 15 días hábiles)
CREATE TABLE requerimiento_oirs (
    id_requerimiento SERIAL PRIMARY KEY,
    codigo_seguimiento VARCHAR(20) UNIQUE NOT NULL,
    tipo_solicitud VARCHAR(30) NOT NULL,
    detalle_solicitud TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Ingresado'
        CHECK (estado IN ('Ingresado', 'En Proceso', 'Respondido', 'Cerrado', 'Rechazado')),
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_limite DATE NOT NULL, -- Calculada en el servicio: fecha_ingreso + 15 días hábiles
    es_anonimo BOOLEAN NOT NULL DEFAULT FALSE,
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento) ON DELETE RESTRICT
);

-- 5. Tabla: auditoria_log (Registro inalterable / append-only de acciones de usuario)
CREATE TABLE auditoria_log (
    id_log BIGSERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    id_establecimiento INT REFERENCES establecimiento(id_establecimiento) ON DELETE SET NULL,
    accion VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_origen INET
);

-- 6. Tabla: encuesta_satisfaccion (Almacenamiento documental JSONB anónimo - Ley N° 19.628)
CREATE TABLE encuesta_satisfaccion (
    id_encuesta SERIAL PRIMARY KEY,
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento) ON DELETE RESTRICT,
    fecha_respuesta TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datos_documento JSONB NOT NULL
        CHECK (jsonb_typeof(datos_documento) = 'object')
);

-- =========================================================================
-- Índices
-- Postgres no indexa las FK automáticamente.
-- =========================================================================
CREATE INDEX idx_usuario_rol ON usuario(id_rol);
CREATE INDEX idx_usuario_establecimiento ON usuario(id_establecimiento);
CREATE INDEX idx_req_establecimiento ON requerimiento_oirs(id_establecimiento);
CREATE INDEX idx_req_estado_fecha ON requerimiento_oirs(estado, fecha_ingreso);
CREATE INDEX idx_encuesta_establecimiento ON encuesta_satisfaccion(id_establecimiento);
CREATE INDEX idx_auditoria_usuario ON auditoria_log(id_usuario);
CREATE INDEX idx_auditoria_establecimiento ON auditoria_log(id_establecimiento);
CREATE INDEX idx_auditoria_timestamp ON auditoria_log(timestamp);

-- Índice GIN sobre el campo JSONB para optimizar consultas de métricas y analítica
CREATE INDEX idx_gin_encuesta_datos ON encuesta_satisfaccion USING GIN (datos_documento);

-- =========================================================================
-- Regla de integridad: auditoria_log es append-only
-- Se impide UPDATE y DELETE, incluso por SQL directo.
-- =========================================================================
CREATE OR REPLACE FUNCTION fn_auditoria_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'auditoria_log es append-only: no se permite DELETE';
    END IF;

    -- Excepción: ON DELETE SET NULL de las FK (id_usuario / id_establecimiento).
    -- Solo se permite si el resto del contenido del log no cambia.
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

CREATE TRIGGER trg_auditoria_append_only
BEFORE UPDATE OR DELETE ON auditoria_log
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_append_only();
