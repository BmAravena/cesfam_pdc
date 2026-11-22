import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../features/auth/useAuth'
import { descargarCsv } from '../../lib/csv'
import { hasRole } from '../../lib/auth'
import { GESTION_ROLES } from '../../lib/roles'
import { getErrorMessage } from '../../services/api'
import {
  obtenerReporteEncuestas,
  type EncuestaReporteItem,
} from '../../services/encuestas'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'
import {
  obtenerEstadisticasRequerimientos,
  type EstadisticaRequerimiento,
} from '../../services/requerimientos'

function formatearNumero(valor: number): string {
  return valor.toLocaleString('es-CL')
}

function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
}

function formatearPromedio(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('es-CL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function claseTasa(tasa: number): string {
  if (tasa >= 90) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (tasa >= 70) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-red-50 text-red-700 ring-red-200'
}

export function MetricasPage() {
  const { user } = useAuth()
  const puedeFiltrarSede = hasRole(user, GESTION_ROLES)

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticaRequerimiento[]>([])
  const [encuestas, setEncuestas] = useState<EncuestaReporteItem[]>([])
  const [establecimientoId, setEstablecimientoId] = useState<number | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let activo = true

    listarEstablecimientos()
      .then((data) => {
        if (activo) setEstablecimientos(data)
      })
      .catch((requestError) => {
        if (activo) setError(getErrorMessage(requestError))
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true
    const params = establecimientoId
      ? { establecimiento_id: establecimientoId }
      : {}

    setCargando(true)
    setError(null)

    Promise.all([
      obtenerEstadisticasRequerimientos(params),
      obtenerReporteEncuestas(params),
    ])
      .then(([estadisticasData, encuestasData]) => {
        if (!activo) return
        setEstadisticas(estadisticasData)
        setEncuestas(encuestasData)
      })
      .catch((requestError) => {
        if (activo) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [establecimientoId, recargar])

  const nombrePorId = useMemo(
    () =>
      new Map(
        establecimientos.map((establecimiento) => [
          establecimiento.id_establecimiento,
          establecimiento.nombre_centro,
        ]),
      ),
    [establecimientos],
  )

  const totales = useMemo(() => {
    const sumar = (clave: keyof EstadisticaRequerimiento) =>
      estadisticas.reduce((acumulado, fila) => {
        const valor = fila[clave]
        return acumulado + (typeof valor === 'number' ? valor : 0)
      }, 0)

    const total = sumar('total')
    const vencidos = sumar('vencidos')
    const tasa =
      total === 0 ? 0 : ((total - vencidos) / total) * 100

    return {
      total,
      respondidos: sumar('respondidos'),
      vencidos,
      tasa,
    }
  }, [estadisticas])

  const encuestasPorId = useMemo(
    () =>
      new Map(
        encuestas.map((reporte) => [reporte.id_establecimiento, reporte]),
      ),
    [encuestas],
  )

  function handleExportar() {
    const filas: (string | number | null)[][] = [
      ['Cumplimiento de requerimientos por CESFAM'],
      [
        'CESFAM',
        'Total',
        'Ingresados',
        'En proceso',
        'Respondidos',
        'Cerrados',
        'Rechazados',
        'Vencidos',
        'Tasa de cumplimiento (%)',
      ],
      ...estadisticas.map((fila) => [
        fila.nombre_centro,
        fila.total,
        fila.ingresados,
        fila.en_proceso,
        fila.respondidos,
        fila.cerrados,
        fila.rechazados,
        fila.vencidos,
        fila.tasa_cumplimiento,
      ]),
      [],
      ['Satisfacción ciudadana'],
      ['CESFAM', 'Respuestas', 'Trato', 'Tiempo de espera', 'Calidad'],
      ...encuestas.map((reporte) => [
        nombrePorId.get(reporte.id_establecimiento) ??
          `Sede #${reporte.id_establecimiento}`,
        reporte.total_respuestas,
        reporte.promedio_trato,
        reporte.promedio_tiempo_espera,
        reporte.promedio_calidad,
      ]),
    ]

    const sufijo = establecimientoId
      ? `sede-${establecimientoId}`
      : puedeFiltrarSede
        ? 'todas-las-sedes'
        : 'mi-sede'
    descargarCsv(`metricas-${sufijo}-${new Date().toISOString().slice(0, 10)}`, filas)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {puedeFiltrarSede ? 'Métricas por CESFAM' : 'Métricas de mi CESFAM'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {puedeFiltrarSede
              ? 'Cumplimiento de plazos y satisfacción ciudadana de todos los centros de la comuna.'
              : 'Cumplimiento de plazos y satisfacción ciudadana de tu establecimiento.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {puedeFiltrarSede && (
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Establecimiento
              <select
                value={establecimientoId}
                onChange={(event) =>
                  setEstablecimientoId(
                    event.target.value ? Number(event.target.value) : '',
                  )
                }
                className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              >
                <option value="">Todas las sedes</option>
                {establecimientos.map((establecimiento) => (
                  <option
                    key={establecimiento.id_establecimiento}
                    value={establecimiento.id_establecimiento}
                  >
                    {establecimiento.nombre_centro}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={handleExportar}
            disabled={cargando || estadisticas.length === 0}
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setRecargar((valor) => valor + 1)}
            disabled={cargando}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          No se pudieron cargar las métricas: {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { etiqueta: 'Requerimientos totales', valor: totales.total },
          { etiqueta: 'Respondidos', valor: totales.respondidos },
          { etiqueta: 'Vencidos', valor: totales.vencidos },
          {
            etiqueta: 'Tasa de cumplimiento',
            valor: formatearPorcentaje(totales.tasa),
          },
        ].map((indicador) => (
          <article
            key={indicador.etiqueta}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{indicador.etiqueta}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {cargando
                ? '…'
                : typeof indicador.valor === 'number'
                  ? formatearNumero(indicador.valor)
                  : indicador.valor}
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Cumplimiento de requerimientos
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            La tasa considera los requerimientos abiertos cuya fecha límite ya
            pasó como vencidos.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">CESFAM</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Ingresados</th>
                <th className="px-4 py-3 text-right font-semibold">En proceso</th>
                <th className="px-4 py-3 text-right font-semibold">Respondidos</th>
                <th className="px-4 py-3 text-right font-semibold">Cerrados</th>
                <th className="px-4 py-3 text-right font-semibold">Rechazados</th>
                <th className="px-4 py-3 text-right font-semibold">Vencidos</th>
                <th className="px-4 py-3 text-right font-semibold">Tasa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Cargando métricas…
                  </td>
                </tr>
              ) : estadisticas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No hay requerimientos registrados para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                estadisticas.map((fila) => (
                  <tr key={fila.id_establecimiento} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {fila.nombre_centro}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.ingresados)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.en_proceso)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.respondidos)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.cerrados)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(fila.rechazados)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">
                      {formatearNumero(fila.vencidos)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                          claseTasa(fila.tasa_cumplimiento),
                        ].join(' ')}
                      >
                        {formatearPorcentaje(fila.tasa_cumplimiento)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Satisfacción ciudadana
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Promedios de las encuestas respondidas. Escala según el formulario
            aplicado en cada centro.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">CESFAM</th>
                <th className="px-4 py-3 text-right font-semibold">Respuestas</th>
                <th className="px-4 py-3 text-right font-semibold">Trato</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Tiempo de espera
                </th>
                <th className="px-4 py-3 text-right font-semibold">Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Cargando encuestas…
                  </td>
                </tr>
              ) : encuestas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Aún no hay encuestas de satisfacción registradas.
                  </td>
                </tr>
              ) : (
                encuestas.map((reporte) => (
                  <tr
                    key={reporte.id_establecimiento}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {nombrePorId.get(reporte.id_establecimiento) ??
                        `Sede #${reporte.id_establecimiento}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(reporte.total_respuestas)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearPromedio(reporte.promedio_trato)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearPromedio(reporte.promedio_tiempo_espera)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearPromedio(reporte.promedio_calidad)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!cargando && estadisticas.length > 0 && (
        <p className="text-xs text-slate-500">
          {establecimientoId
            ? `Mostrando ${estadisticas.length} centro filtrado.`
            : puedeFiltrarSede
              ? `Mostrando ${estadisticas.length} centros con actividad de OIRS.`
              : 'Mostrando las métricas de tu establecimiento.'}
          {encuestasPorId.size === 0 &&
            ' Todavía no hay encuestas de satisfacción para graficar.'}
        </p>
      )}
    </div>
  )
}
