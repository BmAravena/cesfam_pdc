import api from './api'

export interface Establecimiento {
  id_establecimiento: number
  nombre_centro: string
  tipo_centro: string
}

/** Catálogo público de establecimientos (GET /establecimientos). */
export async function listarEstablecimientos(): Promise<Establecimiento[]> {
  const { data } = await api.get<Establecimiento[]>('/establecimientos')
  return data
}
