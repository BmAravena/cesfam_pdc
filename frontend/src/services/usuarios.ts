import api from './api'

export interface Usuario {
  id_usuario: number
  rut: string
  nombre: string
  email: string
  id_rol: number
  id_establecimiento: number
  activo: boolean
  fecha_baja: string | null
}

export interface CrearUsuarioPayload {
  rut: string
  nombre: string
  email: string
  password: string
  id_rol: number
  id_establecimiento: number
}

export interface ActualizarUsuarioPayload {
  rut?: string
  nombre?: string
  email?: string
  password?: string
  id_rol?: number
  id_establecimiento?: number
  activo?: boolean
}

/** GET /usuarios — solo Administrador. */
export async function listarUsuarios(
  incluirInactivos = false,
): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios', {
    params: { incluir_inactivos: incluirInactivos },
  })
  return data
}

/** POST /usuarios — solo Administrador. */
export async function crearUsuario(
  payload: CrearUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', payload)
  return data
}

/** PATCH /usuarios/{id} — solo Administrador. */
export async function actualizarUsuario(
  usuarioId: number,
  payload: ActualizarUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${usuarioId}`, payload)
  return data
}

/** DELETE /usuarios/{id} — baja lógica, solo Administrador. */
export async function darBajaUsuario(usuarioId: number): Promise<void> {
  await api.delete(`/usuarios/${usuarioId}`)
}
