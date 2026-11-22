import api from './api'

/** Métricas agregadas de satisfacción por establecimiento. */
export interface EncuestaReporteItem {
  id_establecimiento: number
  total_respuestas: number
  promedio_trato: number | null
  promedio_tiempo_espera: number | null
  promedio_calidad: number | null
}

/**
 * GET /encuestas/reportes — alcance según el rol:
 * local solo su centro; comunal y administrador, todos o filtro.
 */
export async function obtenerReporteEncuestas(
  params: { establecimiento_id?: number } = {},
): Promise<EncuestaReporteItem[]> {
  const { data } = await api.get<EncuestaReporteItem[]>(
    '/encuestas/reportes',
    { params },
  )
  return data
}
