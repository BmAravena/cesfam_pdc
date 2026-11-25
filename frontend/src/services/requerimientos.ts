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
  respuesta: string | null
  fecha_respuesta: string | null
  fecha_ingreso: string
  fecha_limite: string
}

/**
 * Fila de la bandeja interna. No incluye `detalle_solicitud` ni `respuesta`:
 * esos campos se obtienen con `obtenerRequerimiento()` al abrir el detalle.
 */
export interface RequerimientoListItem {
  id_requerimiento: number
  codigo_seguimiento: string
  tipo_solicitud: string
  estado: EstadoRequerimiento
  fecha_ingreso: string
  fecha_limite: string
  id_establecimiento: number
  nombre_centro: string
}

/** Respuesta pública de seguimiento (no incluye el detalle por privacidad). */
export interface RequerimientoPublicoResponse {
  codigo_seguimiento: string
  tipo_solicitud: string
  estado: EstadoRequerimiento
  respuesta: string | null
  fecha_respuesta: string | null
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

/** Totales agregados que consume el panel de control. */
export interface RequerimientoResumen {
  total: number
  abiertos: number
  respondidos: number
  vencidos: number
  tasa_cumplimiento: number
}

/**
 * GET /requerimientos/resumen — indicadores del panel ya calculados en el
 * backend y filtrados por el alcance del rol (sin traer las filas).
 */
export async function obtenerResumenRequerimientos(
  params: { establecimiento_id?: number; anio?: number } = {},
): Promise<RequerimientoResumen> {
  const { data } = await api.get<RequerimientoResumen>(
    '/requerimientos/resumen',
    { params },
  )
  return data
}

export interface ListarRequerimientosParams {
  establecimiento_id?: number
  estado?: EstadoRequerimiento
  anio?: number
  skip?: number
  limit?: number
}

/** Conteo de reclamos de una sede (0 si no tiene). */
export interface ReclamoEstablecimiento {
  id_establecimiento: number
  nombre_centro: string
  total_reclamos: number
}

/** Resumen de reclamos ya acotado al alcance del rol por el backend. */
export interface ReclamosResumen {
  total_reclamos: number
  por_establecimiento: ReclamoEstablecimiento[]
}

/**
 * GET /requerimientos/reclamos/resumen — total de reclamos (tipo "Reclamo")
 * y desglose por CESFAM, incluyendo sedes con 0 reclamos.
 */
export async function obtenerResumenReclamos(
  params: { anio?: number } = {},
): Promise<ReclamosResumen> {
  const { data } = await api.get<ReclamosResumen>(
    '/requerimientos/reclamos/resumen',
    { params },
  )
  return data
}

/**
 * GET /requerimientos/anios — años con requerimientos según el alcance del
 * rol, del más reciente al más antiguo.
 */
export async function obtenerAniosRequerimientos(): Promise<number[]> {
  const { data } = await api.get<number[]>('/requerimientos/anios')
  return data
}

/**
 * GET /requerimientos — listado interno.
 *
 * El backend aplica el alcance del rol: un Funcionario Local solo recibe
 * los requerimientos de su establecimiento; Administrador y Encargado
 * Comunal reciben todos.
 */
export async function listarRequerimientos(
  params: ListarRequerimientosParams = {},
): Promise<RequerimientoListItem[]> {
  const { data } = await api.get<RequerimientoListItem[]>('/requerimientos', {
    params,
  })
  return data
}

/** GET /requerimientos/{id} — detalle completo para el modal. */
export async function obtenerRequerimiento(
  requerimientoId: number,
): Promise<RequerimientoResponse> {
  const { data } = await api.get<RequerimientoResponse>(
    `/requerimientos/${requerimientoId}`,
  )
  return data
}

/** Métricas agregadas por CESFAM. */
export interface EstadisticaRequerimiento {
  id_establecimiento: number
  nombre_centro: string
  total: number
  ingresados: number
  en_proceso: number
  respondidos: number
  cerrados: number
  rechazados: number
  vencidos: number
  tasa_cumplimiento: number
}

/**
 * GET /requerimientos/estadisticas — alcance según el rol:
 * local solo su centro; comunal y administrador, comparativo global.
 */
export async function obtenerEstadisticasRequerimientos(
  params: { establecimiento_id?: number; anio?: number } = {},
): Promise<EstadisticaRequerimiento[]> {
  const { data } = await api.get<EstadisticaRequerimiento[]>(
    '/requerimientos/estadisticas',
    { params },
  )
  return data
}

/**
 * PATCH /requerimientos/{id}/respuesta — guarda la respuesta y deja el
 * requerimiento en estado "Respondido".
 */
export async function responderRequerimiento(
  requerimientoId: number,
  respuesta: string,
): Promise<RequerimientoResponse> {
  const { data } = await api.patch<RequerimientoResponse>(
    `/requerimientos/${requerimientoId}/respuesta`,
    { respuesta },
  )
  return data
}

/**
 * PATCH /requerimientos/{id}/estado — cambia el estado y registra auditoría.
 * Se usa para tomar un caso (En Proceso), cerrarlo o rechazarlo.
 */
export async function cambiarEstadoRequerimiento(
  requerimientoId: number,
  estado: EstadoRequerimiento,
): Promise<RequerimientoResponse> {
  const { data } = await api.patch<RequerimientoResponse>(
    `/requerimientos/${requerimientoId}/estado`,
    { estado },
  )
  return data
}
