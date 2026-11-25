import { useEffect, useState } from 'react'

import { ANIO_ACTUAL, ANIOS_DISPONIBLES } from '../../lib/anios'
import { obtenerAniosRequerimientos } from '../../services/requerimientos'

let cache: number[] | null = null

function combinar(anios: number[]): number[] {
  return Array.from(
    new Set([ANIO_ACTUAL, ...anios, ...ANIOS_DISPONIBLES]),
  ).sort((a, b) => b - a)
}

/**
 * Años seleccionables para los filtros. Combina los años con datos reales
 * (según el alcance del rol) con el rango de respaldo, para no perder años
 * antiguos que no estén en el rango por defecto. Se consulta una sola vez
 * por sesión.
 */
export function useAniosRequerimientos(): number[] {
  const [anios, setAnios] = useState<number[]>(() => cache ?? combinar([]))

  useEffect(() => {
    if (cache) return

    let activo = true
    obtenerAniosRequerimientos()
      .then((data) => {
        const combinados = combinar(data)
        cache = combinados
        if (activo) setAnios(combinados)
      })
      .catch(() => {
        // Si falla la consulta, se mantiene el rango de respaldo.
      })

    return () => {
      activo = false
    }
  }, [])

  return anios
}
