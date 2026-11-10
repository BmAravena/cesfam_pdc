-- OBSOLETO: los datos base ahora vienen de la migración
-- alembic/versions/0002_seed_base.py
-- Insertar roles base del sistema
INSERT INTO rol (id_rol, nombre_rol, descripcion) VALUES
(1, 'Administrador del Sistema', 'Control total de la plataforma y configuraciones.'),
(2, 'Encargado OIRS Comunal', 'Supervisión y reportes de todos los centros de salud de Padre Las Casas.'),
(3, 'Funcionario Local', 'Gestión de requerimientos y casos asignados a su establecimiento.');

-- Insertar establecimiento principal
INSERT INTO establecimiento (id_establecimiento, nombre_centro, tipo_centro) VALUES
(1, 'CESFAM Padre Las Casas', 'CESFAM Urbano');