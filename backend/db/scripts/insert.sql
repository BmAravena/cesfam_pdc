-- =========================================================================
-- OBSOLETO: script de referencia histórica.
-- La fuente de verdad de los datos base es Alembic:
--   - 0002_seed_base: roles y CESFAM Padre Las Casas
--   - 10752746fbd4: CESFAM adicionales
--   - d4e5f6a7b8c9: direccion de establecimientos
-- Crear/actualizar la base con: alembic upgrade head
-- =========================================================================

-- Insertar roles base del sistema.
INSERT INTO rol (id_rol, nombre_rol, descripcion) VALUES
(1, 'Administrador del Sistema', 'Control total de la plataforma y configuraciones.'),
(2, 'Encargado OIRS Comunal', 'Supervisión y reportes de todos los centros de salud de Padre Las Casas.'),
(3, 'Funcionario Local', 'Gestión de requerimientos y casos asignados a su establecimiento.')
ON CONFLICT (id_rol) DO UPDATE SET
    nombre_rol = EXCLUDED.nombre_rol,
    descripcion = EXCLUDED.descripcion;

-- Insertar establecimientos con su dirección.
INSERT INTO establecimiento (
    id_establecimiento,
    nombre_centro,
    tipo_centro,
    direccion
) VALUES
(1, 'CESFAM Padre Las Casas', 'CESFAM Urbano', 'Almte. Barroso 365, 4851202 Padre las Casas, Padre Las Casas, Araucanía'),
(2, 'CESFAM Las Colinas', 'CESFAM Urbano', 'Manil 130, 4850713 Padre las Casas, Padre Las Casas, Araucanía'),
(3, 'CESFAM Conun Huenu', 'CESFAM Urbano', 'Av. Pulmahue 1300-1398, Padre las Casas, Padre Las Casas, Araucanía'),
(4, 'CESFAM Pulmahue', 'CESFAM Urbano', 'Av. La Quebrada 1419, 4851622 Padre las Casas, Padre Las Casas, Araucanía')
ON CONFLICT (id_establecimiento) DO UPDATE SET
    nombre_centro = EXCLUDED.nombre_centro,
    tipo_centro = EXCLUDED.tipo_centro,
    direccion = EXCLUDED.direccion;

-- Ajustar las secuencias tras insertar IDs explícitos, para que los
-- próximos INSERT generados por la aplicación no choquen con estos valores.
SELECT setval(
    pg_get_serial_sequence('rol', 'id_rol'),
    COALESCE((SELECT MAX(id_rol) FROM rol), 1),
    true
);
SELECT setval(
    pg_get_serial_sequence('establecimiento', 'id_establecimiento'),
    COALESCE((SELECT MAX(id_establecimiento) FROM establecimiento), 1),
    true
);
