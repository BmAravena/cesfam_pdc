/**
 * Roles definidos por el backend (backend/services/authz.py).
 * Se centralizan aquí para no repetir strings en las rutas y vistas.
 */
export const ROLES = {
  ADMIN: 'Administrador del Sistema',
  COMUNAL: 'Encargado OIRS Comunal',
  LOCAL: 'Funcionario Local',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Todos los roles con acceso al panel interno. */
export const PANEL_ROLES: readonly string[] = Object.values(ROLES)

/** Roles con alcance global (pueden ver cualquier establecimiento). */
export const GESTION_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.COMUNAL]

/** Módulos exclusivos del Administrador del Sistema. */
export const ADMIN_ONLY: readonly string[] = [ROLES.ADMIN]
