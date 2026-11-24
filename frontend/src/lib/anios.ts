/**
 * Año en curso según la fecha del navegador. Se usa como filtro por defecto
 * en las vistas de requerimientos y métricas.
 */
export const ANIO_ACTUAL = new Date().getFullYear()

/**
 * Años seleccionables, del más reciente al más antiguo. Incluye desde 2020
 * hasta el año actual para cubrir el histórico de la oficina OIRS.
 */
export const ANIOS_DISPONIBLES: number[] = Array.from(
  { length: Math.max(ANIO_ACTUAL - 2020 + 1, 1) },
  (_, indice) => ANIO_ACTUAL - indice,
)
