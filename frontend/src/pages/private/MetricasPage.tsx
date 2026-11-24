import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../features/auth/useAuth'
import { ANIO_ACTUAL, ANIOS_DISPONIBLES } from '../../lib/anios'
import { descargarCsv } from '../../lib/csv'
import { hasRole } from '../../lib/auth'
import { GESTION_ROLES } from '../../lib/roles'
import { getErrorMessage } from '../../services/api'
import {
  descargarReporteEncuestasCsv,
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

const DIMENSIONES_SATISFACCION = [
  { clave: 'calidad_atencion', etiqueta: 'Calidad' },
  { clave: 'tiempo_espera', etiqueta: 'Tiempo de espera' },
  { clave: 'trato_personal', etiqueta: 'Trato' },
  { clave: 'presentacion_limpieza', etiqueta: 'Presentación' },
  { clave: 'claridad_indicaciones', etiqueta: 'Claridad' },
] as const

const ESCALA_SATISFACCION = [
  'Muy insatisfecho',
  'Insatisfecho',
  'Neutral',
  'Satisfecho',
  'Muy satisfecho',
]

function formatearFechaHora(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

export function MetricasPage() {
  const { user } = useAuth()
  const puedeFiltrarSede = hasRole(user, GESTION_ROLES)

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticaRequerimiento[]>([])
  const [encuestas, setEncuestas] = useState<EncuestaReporteItem[]>([])
  const [establecimientoId, setEstablecimientoId] = useState<number | ''>('')
  const [anio, setAnio] = useState<number | ''>(ANIO_ACTUAL)
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | null>(
    null,
  )
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
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
    const params = {
      ...(establecimientoId ? { establecimiento_id: establecimientoId } : {}),
      ...(anio !== '' ? { anio } : {}),
    }

    setCargando(true)
    setError(null)

    Promise.all([
      obtenerEstadisticasRequerimientos(params),
      obtenerReporteEncuestas(
        establecimientoId ? { establecimiento_id: establecimientoId } : {},
      ),
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
  }, [establecimientoId, anio, recargar])

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

  // Si la sucursal seleccionada deja de estar en los datos (por ejemplo al
  // cambiar el filtro superior), volvemos automáticamente a la vista general.
  const sucursalActiva =
    sucursalSeleccionada !== null &&
    encuestas.some(
      (reporte) => reporte.id_establecimiento === sucursalSeleccionada,
    )
      ? sucursalSeleccionada
      : null

  const encuestasVisibles = useMemo(
    () =>
      sucursalActiva === null
        ? encuestas
        : encuestas.filter(
            (reporte) => reporte.id_establecimiento === sucursalActiva,
          ),
    [encuestas, sucursalActiva],
  )

  const nombreSucursalActiva =
    sucursalActiva === null
      ? null
      : (nombrePorId.get(sucursalActiva) ?? `Sede #${sucursalActiva}`)

  const distribucionTotal = useMemo(
    () =>
      DIMENSIONES_SATISFACCION.map((dimension) => {
        const valores = [1, 2, 3, 4, 5].map((valor) =>
          encuestasVisibles.reduce(
            (acumulado, reporte) =>
              acumulado +
              (reporte.distribucion[dimension.clave]?.[String(valor)] ?? 0),
            0,
          ),
        )
        return {
          ...dimension,
          valores,
          total: valores.reduce((acumulado, valor) => acumulado + valor, 0),
        }
      }),
    [encuestasVisibles],
  )

  const comentariosRecientes = useMemo(
    () =>
      encuestasVisibles
        .flatMap((reporte) =>
          reporte.comentarios.map((comentario) => ({
            ...comentario,
            id_establecimiento: reporte.id_establecimiento,
          })),
        )
        .sort((a, b) => b.fecha_respuesta.localeCompare(a.fecha_respuesta)),
    [encuestasVisibles],
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
      [
        'CESFAM',
        'Respuestas',
        ...DIMENSIONES_SATISFACCION.map((dimension) => dimension.etiqueta),
      ],
      ...encuestas.map((reporte) => [
        nombrePorId.get(reporte.id_establecimiento) ??
          `Sede #${reporte.id_establecimiento}`,
        reporte.total_respuestas,
        ...DIMENSIONES_SATISFACCION.map(
          (dimension) => reporte.promedios[dimension.clave] ?? null,
        ),
      ]),
    ]

    const sufijo = establecimientoId
      ? `sede-${establecimientoId}`
      : puedeFiltrarSede
        ? 'todas-las-sedes'
        : 'mi-sede'
    const periodo = anio !== '' ? String(anio) : 'todos-los-anios'
    descargarCsv(
      `metricas-${sufijo}-${periodo}-${new Date().toISOString().slice(0, 10)}`,
      filas,
    )
  }

  async function handleExportarEncuestas() {
    setError(null)
    setExportando(true)

    try {
      const centro = sucursalActiva ?? (establecimientoId || null)
      const params = centro ? { establecimiento_id: centro } : {}
      const blob = await descargarReporteEncuestasCsv(params)
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `encuestas-satisfaccion-${
        centro ?? 'todas-las-sedes'
      }-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setExportando(false)
    }
  }

  function seleccionarSucursal(establecimientoIdSeleccionado: number) {
    setSucursalSeleccionada((actual) =>
      actual === establecimientoIdSeleccionado
        ? null
        : establecimientoIdSeleccionado,
    )
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
                onChange={(event) => {
                  setEstablecimientoId(
                    event.target.value ? Number(event.target.value) : '',
                  )
                  setSucursalSeleccionada(null)
                }}
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
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Año
            <select
              value={anio}
              onChange={(event) => {
                setAnio(event.target.value ? Number(event.target.value) : '')
                setSucursalSeleccionada(null)
              }}
              className="min-w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              <option value="">Todos los años</option>
              {ANIOS_DISPONIBLES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleExportar}
            disabled={
              cargando || (estadisticas.length === 0 && encuestas.length === 0)
            }
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handleExportarEncuestas}
            disabled={cargando || exportando || encuestas.length === 0}
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportando ? 'Exportando…' : 'Exportar satisfacción (CSV)'}
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
            Promedios de las encuestas respondidas, en escala de 1 a 5. Haz clic
            en un CESFAM para ver su distribución individual.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">CESFAM</th>
                <th className="px-4 py-3 text-right font-semibold">Respuestas</th>
                {DIMENSIONES_SATISFACCION.map((dimension) => (
                  <th
                    key={dimension.clave}
                    className="px-4 py-3 text-right font-semibold"
                  >
                    {dimension.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan={2 + DIMENSIONES_SATISFACCION.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando encuestas…
                  </td>
                </tr>
              ) : encuestas.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + DIMENSIONES_SATISFACCION.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Aún no hay encuestas de satisfacción registradas.
                  </td>
                </tr>
              ) : (
                encuestas.map((reporte) => (
                  <tr
                    key={reporte.id_establecimiento}
                    title="Ver distribución de este CESFAM"
                    onClick={() =>
                      seleccionarSucursal(reporte.id_establecimiento)
                    }
                    className={[
                      'cursor-pointer transition-colors',
                      sucursalActiva === reporte.id_establecimiento
                        ? 'bg-brand-50'
                        : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          seleccionarSucursal(reporte.id_establecimiento)
                        }}
                        className="text-left font-medium text-slate-900 hover:text-brand-700"
                      >
                        {nombrePorId.get(reporte.id_establecimiento) ??
                          `Sede #${reporte.id_establecimiento}`}
                        <span className="mt-0.5 block text-xs font-normal text-brand-700">
                          {sucursalActiva === reporte.id_establecimiento
                            ? 'Mostrando su distribución'
                            : 'Ver distribución →'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatearNumero(reporte.total_respuestas)}
                    </td>
                    {DIMENSIONES_SATISFACCION.map((dimension) => (
                      <td
                        key={dimension.clave}
                        className="px-4 py-3 text-right text-slate-700"
                      >
                        {formatearPromedio(
                          reporte.promedios[dimension.clave] ?? null,
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Distribución de respuestas
              {nombreSucursalActiva ? ` · ${nombreSucursalActiva}` : ''}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {nombreSucursalActiva
                ? 'Cantidad de respuestas por valor en cada dimensión para esta sucursal.'
                : 'Cantidad de respuestas por valor en cada dimensión, para el filtro seleccionado.'}
            </p>
          </div>
          {sucursalActiva !== null && (
            <button
              type="button"
              onClick={() => setSucursalSeleccionada(null)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Ver todas las sedes
            </button>
          )}
        </div>
        {encuestasVisibles.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Sin respuestas para mostrar.
          </p>
        ) : (
          <div className="grid gap-5 p-4 sm:grid-cols-2">
            {distribucionTotal.map((dimension) => {
              const maximo = Math.max(...dimension.valores, 1)
              return (
                <article
                  key={dimension.clave}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {dimension.etiqueta}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {formatearNumero(dimension.total)} respuestas
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {dimension.valores.map((cantidad, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 text-slate-500">
                          {index + 1} · {ESCALA_SATISFACCION[index]}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{
                              width: `${(cantidad / maximo) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right font-medium text-slate-700">
                          {formatearNumero(cantidad)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Comentarios de usuarios
            {nombreSucursalActiva ? ` · ${nombreSucursalActiva}` : ''}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Observaciones cualitativas opcionales. La encuesta no recopila datos
            personales.
          </p>
        </div>
        {comentariosRecientes.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {nombreSucursalActiva
              ? 'Esta sucursal aún no tiene comentarios registrados.'
              : 'Aún no hay comentarios registrados.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {comentariosRecientes.map((comentario, index) => (
              <li
                key={`${comentario.id_establecimiento}-${comentario.fecha_respuesta}-${index}`}
                className="px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {nombrePorId.get(comentario.id_establecimiento) ??
                      `Sede #${comentario.id_establecimiento}`}
                  </span>
                  <time dateTime={comentario.fecha_respuesta}>
                    {formatearFechaHora(comentario.fecha_respuesta)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {comentario.comentario}
                </p>
              </li>
            ))}
          </ul>
        )}
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
