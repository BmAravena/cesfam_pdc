import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_TITLE = 'OIRS Salud Padre Las Casas'

const TITULOS: Array<[string, string]> = [
  ['/', 'Portal ciudadano'],
  ['/solicitud', 'Ingresar requerimiento'],
  ['/consulta', 'Consultar estado'],
  ['/encuesta', 'Encuesta de satisfacción'],
  ['/login', 'Iniciar sesión'],
  ['/panel', 'Panel de control'],
  ['/panel/requerimientos', 'Requerimientos'],
  ['/panel/metricas', 'Métricas'],
  ['/panel/usuarios', 'Usuarios'],
  ['/panel/establecimientos', 'Establecimientos'],
  ['/panel/auditoria', 'Auditoría'],
]

function tituloDeRuta(pathname: string): string {
  const ruta = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname
  const encontrada = TITULOS.find(([rutaBase]) => rutaBase === ruta)
  return encontrada ? encontrada[1] : 'Página no encontrada'
}

/**
 * Anuncia cada cambio de ruta a lectores de pantalla:
 * 1. actualiza el título del documento (orientación en la pestaña),
 * 2. mueve el foco al <h1> de la página nueva (NVDA lo lee al instante),
 * 3. vuelve el scroll al inicio.
 *
 * En la carga inicial no se mueve el foco para no interferir con el
 * `autoFocus` del formulario de acceso.
 */
export function RouteAnnouncer() {
  const location = useLocation()
  const rutaAnunciada = useRef<string | null>(null)

  useEffect(() => {
    document.title = `${tituloDeRuta(location.pathname)} · ${BASE_TITLE}`

    // Evita repetir el anuncio (incluye la doble invocación de StrictMode).
    if (rutaAnunciada.current === location.pathname) return

    const esPrimeraCarga = rutaAnunciada.current === null
    rutaAnunciada.current = location.pathname

    // En la carga inicial no se mueve el foco para no interferir con el
    // `autoFocus` del formulario de acceso.
    if (esPrimeraCarga) return

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    const main = document.getElementById('contenido-principal')
    const heading = main?.querySelector<HTMLElement>('h1')

    if (heading) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
      return
    }

    if (main) {
      main.setAttribute('tabindex', '-1')
      main.focus({ preventScroll: true })
    }
  }, [location.pathname])

  return null
}
