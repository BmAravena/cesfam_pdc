"""Reglas de autorización RBAC (multi-sede con centro base).

El establecimiento del usuario es su centro base. Los roles con alcance
global (Administrador y Encargado Comunal) pueden operar sobre cualquier
establecimiento; el Funcionario Local solo sobre el suyo.
"""

ROL_ADMIN = "Administrador del Sistema"
ROL_COMUNAL = "Encargado OIRS Comunal"
ROL_LOCAL = "Funcionario Local"

ROLES_ALCANCE_GLOBAL = frozenset({ROL_ADMIN, ROL_COMUNAL})


def tiene_alcance_global(nombre_rol: str) -> bool:
    return nombre_rol in ROLES_ALCANCE_GLOBAL


def puede_acceder_establecimiento(
    nombre_rol: str,
    id_establecimiento_usuario: int,
    id_establecimiento_objetivo: int,
) -> bool:
    if tiene_alcance_global(nombre_rol):
        return True
    return id_establecimiento_usuario == id_establecimiento_objetivo
