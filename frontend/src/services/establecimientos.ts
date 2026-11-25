import api from './api'

export interface Establecimiento {
  id_establecimiento: number
  nombre_centro: string
  tipo_centro: string
  direccion: string | null
}

export interface EstablecimientoPayload {
  nombre_centro: string
  tipo_centro: string
  direccion: string | null
}

/** Catálogo público de establecimientos (GET /establecimientos). */
export async function listarEstablecimientos(): Promise<Establecimiento[]> {
  const { data } = await api.get<Establecimiento[]>('/establecimientos')
  return data
}

/** POST /establecimientos — exclusivo del Administrador. */
export async function crearEstablecimiento(
  payload: EstablecimientoPayload,
): Promise<Establecimiento> {
  const { data } = await api.post<Establecimiento>(
    '/establecimientos',
    payload,
  )
  return data
}

/** PATCH /establecimientos/{id} — exclusivo del Administrador. */
export async function actualizarEstablecimiento(
  establecimientoId: number,
  payload: Partial<EstablecimientoPayload>,
): Promise<Establecimiento> {
  const { data } = await api.patch<Establecimiento>(
    `/establecimientos/${establecimientoId}`,
    payload,
  )
  return data
}

/** DELETE /establecimientos/{id} — solo si no tiene datos asociados. */
export async function eliminarEstablecimiento(
  establecimientoId: number,
): Promise<void> {
  await api.delete(`/establecimientos/${establecimientoId}`)
}
