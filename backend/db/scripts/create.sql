-- =========================================================================
-- SISTEMA OIRS - SALUD PADRE LAS CASAS
-- Script DDL basado en el Modelo de Datos Relacional (ACID/RBAC) + Documental (JSONB)
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
    id_rol INT NOT NULL REFERENCES rol(id_rol),
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento)
);

-- 4. Tabla: requerimiento_oirs (Solicitudes ciudadanas con plazo legal de 15 días hábiles)
CREATE TABLE requerimiento_oirs (
    id_requerimiento SERIAL PRIMARY KEY,
    codigo_seguimiento VARCHAR(20) UNIQUE NOT NULL,
    tipo_solicitud VARCHAR(30) NOT NULL,
    detalle_solicitud TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'Ingresado' CHECK (estado IN ('Ingresado', 'En Proceso', 'Respondido', 'Cerrado', 'Rechazado')),
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_limite DATE NOT NULL, -- Calculada a fecha_ingreso + 15 días hábiles (Ley N° 20.584)
    es_anonimo BOOLEAN NOT NULL DEFAULT FALSE,
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento)
);

-- 5. Tabla: auditoria_log (Registro inalterable / append-only de acciones de usuario)
CREATE TABLE auditoria_log (
    id_log BIGSERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuario(id_usuario),
    accion VARCHAR(150) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_origen INET
);

-- 6. Tabla: encuesta_satisfaccion (Almacenamiento documental JSONB anónimo - Ley N° 19.628)
CREATE TABLE encuesta_satisfaccion (
    id_encuesta SERIAL PRIMARY KEY,
    id_establecimiento INT NOT NULL REFERENCES establecimiento(id_establecimiento),
    fecha_respuesta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    datos_documento JSONB NOT NULL -- Contiene calificaciones (trato, tiempos de espera, calidad) + comentarios libres anónimos
);

-- Creación de Índice GIN sobre el campo JSONB para optimizar consultas de métricas y analítica
CREATE INDEX idx_gin_encuesta_datos ON encuesta_satisfaccion USING GIN (datos_documento);