import api from './api'

/** Claves de las dimensiones evaluadas en la encuesta. */
export type DimensionEncuesta =
  | 'calidad_atencion'
  | 'tiempo_espera'
  | 'trato_personal'
  | 'presentacion_limpieza'
  | 'claridad_indicaciones'

export type RespuestasEncuesta = Record<DimensionEncuesta, number>

export interface EncuestaPayload {
  id_establecimiento: number
  datos_documento: RespuestasEncuesta & { comentario?: string }
}

export interface EncuestaComentario {
  fecha_respuesta: string
  comentario: string
}

/** Métricas agregadas de satisfacción por establecimiento. */
export interface EncuestaReporteItem {
  id_establecimiento: number
  total_respuestas: number
  promedios: Record<string, number | null>
  distribucion: Record<string, Record<string, number>>
  comentarios: EncuestaComentario[]
}

export interface ReporteEncuestasParams {
  establecimiento_id?: number
  desde?: string
  hasta?: string
}

/**
 * POST /encuestas — público y anónimo. No envía datos personales.
 */
export async function crearEncuesta(
  payload: EncuestaPayload,
): Promise<{ id_encuesta: number; fecha_respuesta: string | null }> {
  const { data } = await api.post('/encuestas', payload)
  return data
}

/**
 * GET /encuestas/reportes — alcance según el rol:
 * local solo su centro; comunal y administrador, todos o filtro.
 */
export async function obtenerReporteEncuestas(
  params: ReporteEncuestasParams = {},
): Promise<EncuestaReporteItem[]> {
  const { data } = await api.get<EncuestaReporteItem[]>(
    '/encuestas/reportes',
    { params },
  )
  return data
}

/**
 * GET /encuestas/reportes/export.csv — el backend genera el CSV y registra
 * la exportación en auditoria_log.
 */
export async function descargarReporteEncuestasCsv(
  params: ReporteEncuestasParams = {},
): Promise<Blob> {
  const { data } = await api.get<Blob>('/encuestas/reportes/export.csv', {
    params,
    responseType: 'blob',
  })
  return data
}
