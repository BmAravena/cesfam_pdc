import api from './api'

export interface Rol {
  id_rol: number
  nombre_rol: string
  descripcion: string | null
}

/** GET /roles — catálogo disponible solo para Administrador. */
export async function listarRoles(): Promise<Rol[]> {
  const { data } = await api.get<Rol[]>('/roles')
  return data
}
