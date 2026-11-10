import api from './api'

export type EstadoRequerimiento =
  | 'Ingresado'
  | 'En Proceso'
  | 'Respondido'
  | 'Cerrado'
  | 'Rechazado'

export interface RequerimientoPublicoPayload {
  tipo_solicitud: string
  detalle_solicitud: string
  es_anonimo: boolean
  id_establecimiento: number
}

export interface RequerimientoResponse extends RequerimientoPublicoPayload {
  id_requerimiento: number
  codigo_seguimiento: string
  estado: EstadoRequerimiento
  fecha_ingreso: string
  fecha_limite: string
}

/** Respuesta pública de seguimiento (no incluye el detalle por privacidad). */
export interface RequerimientoPublicoResponse {
  codigo_seguimiento: string
  tipo_solicitud: string
  estado: EstadoRequerimiento
  fecha_ingreso: string
  fecha_limite: string
}

/** POST /requerimientos — ingreso público, sin autenticación. */
export async function crearRequerimiento(
  payload: RequerimientoPublicoPayload,
): Promise<RequerimientoResponse> {
  const { data } = await api.post<RequerimientoResponse>(
    '/requerimientos',
    payload,
  )
  return data
}

/** GET /requerimientos/seguimiento/{codigo} — consulta pública. */
export async function consultarSeguimiento(
  codigo: string,
): Promise<RequerimientoPublicoResponse> {
  const { data } = await api.get<RequerimientoPublicoResponse>(
    `/requerimientos/seguimiento/${encodeURIComponent(codigo)}`,
  )
  return data
}
