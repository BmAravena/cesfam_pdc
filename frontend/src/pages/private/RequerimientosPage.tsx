import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getErrorMessage } from '../../services/api'
import {
  listarRequerimientos,
  type EstadoRequerimiento,
  type RequerimientoResponse,
} from '../../services/requerimientos'

const ESTADO_CLASSES: Record<EstadoRequerimiento, string> = {
  Ingresado: 'bg-sky-50 text-sky-700 ring-sky-200',
  'En Proceso': 'bg-amber-50 text-amber-700 ring-amber-200',
  Respondido: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cerrado: 'bg-slate-100 text-slate-700 ring-slate-200',
  Rechazado: 'bg-red-50 text-red-700 ring-red-200',
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}-${mes}-${anio}`
}

export function RequerimientosPage() {
  const [requerimientos, setRequerimientos] = useState<RequerimientoResponse[]>(
    [],
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let activo = true

    setCargando(true)
    setError(null)

    listarRequerimientos({ limit: 200 })
      .then((data) => {
        if (activo) setRequerimientos(data)
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
  }, [recargar])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Requerimientos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Bandeja de solicitudes, reclamos, sugerencias y felicitaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecargar((valor) => valor + 1)}
            disabled={cargando}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualizar
          </button>
          <Link
            to="/solicitud"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Nuevo requerimiento
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          No se pudieron cargar los requerimientos: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Código
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Ingreso
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Límite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando requerimientos…
                  </td>
                </tr>
              ) : requerimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay requerimientos para mostrar.
                  </td>
                </tr>
              ) : (
                requerimientos.map((requerimiento) => (
                  <tr
                    key={requerimiento.id_requerimiento}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {requerimiento.codigo_seguimiento}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {requerimiento.tipo_solicitud}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                          ESTADO_CLASSES[requerimiento.estado],
                        ].join(' ')}
                      >
                        {requerimiento.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatearFecha(requerimiento.fecha_ingreso)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatearFecha(requerimiento.fecha_limite)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
