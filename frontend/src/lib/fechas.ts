/**
 * Utilidades para mostrar fechas del sistema en horario de Chile.
 *
 * La API entrega los instantes en UTC (sufijo `Z`). Si se formatean con la
 * zona del navegador o se muestran sin convertir, la hora aparece corrida
 * respecto de Chile. Aquí fijamos explícitamente `America/Santiago`.
 */

export const ZONA_HORARIA_CHILE = 'America/Santiago'

/** Formatea un timestamp ISO como fecha y hora en horario de Chile. */
export function formatearFechaHora(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ZONA_HORARIA_CHILE,
  }).format(new Date(fecha))
}

/** Devuelve la fecha (AAAA-MM-DD) de un instante, en horario de Chile. */
export function fechaChileISO(fecha: string | Date = new Date()): string {
  const instante = typeof fecha === 'string' ? new Date(fecha) : fecha
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ZONA_HORARIA_CHILE,
  }).formatToParts(instante)

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''

  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

/**
 * Formatea una fecha sin hora (`AAAA-MM-DD`) sin que la zona horaria la
 * desplace al día anterior o siguiente.
 */
export function formatearFechaSolo(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(anio, mes - 1, dia)))
}
