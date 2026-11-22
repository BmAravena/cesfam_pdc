import api from './api'

export interface AuditoriaLog {
  id_log: number
  id_usuario: number | null
  id_establecimiento: number | null
  accion: string
  timestamp: string
  ip_origen: string | null
}

export interface ListarAuditoriaParams {
  id_usuario?: number
  id_establecimiento?: number
  skip?: number
  limit?: number
}

/** GET /auditoria — solo Administrador y Encargado OIRS Comunal. */
export async function listarAuditoria(
  params: ListarAuditoriaParams = {},
): Promise<AuditoriaLog[]> {
  const { data } = await api.get<AuditoriaLog[]>('/auditoria', { params })
  return data
}
