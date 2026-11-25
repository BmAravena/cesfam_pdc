import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import { useAniosRequerimientos } from '../../features/requerimientos/useAniosRequerimientos'
import { ANIO_ACTUAL } from '../../lib/anios'
import { hasRole } from '../../lib/auth'
import { GESTION_ROLES } from '../../lib/roles'
import { getErrorMessage } from '../../services/api'
import {
  obtenerResumenRequerimientos,
  type RequerimientoResumen,
} from '../../services/requerimientos'

function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
}

export function DashboardPage() {
  const { user } = useAuth()
  const aniosDisponibles = useAniosRequerimientos()

  const [resumen, setResumen] = useState<RequerimientoResumen | null>(null)
  const [anio, setAnio] = useState<number | ''>(ANIO_ACTUAL)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    setCargando(true)
    setError(null)

    obtenerResumenRequerimientos(anio !== '' ? { anio } : {})
      .then((data) => {
        if (activo) setResumen(data)
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
  }, [anio])

  const indicadores = [
    {
      etiqueta: 'Requerimientos totales',
      valor: resumen?.total ?? 0,
    },
    {
      etiqueta: 'Abiertos',
      valor: resumen?.abiertos ?? 0,
    },
    {
      etiqueta: 'Respondidos',
      valor: resumen?.respondidos ?? 0,
    },
    {
      etiqueta: 'Vencidos',
      valor: resumen?.vencidos ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Panel de control
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {hasRole(user, GESTION_ROLES)
              ? 'Resumen operativo de la oficina OIRS para todos los establecimientos.'
              : 'Resumen operativo de la oficina OIRS para tu establecimiento.'}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Año
          <select
            value={anio}
            onChange={(event) =>
              setAnio(event.target.value ? Number(event.target.value) : '')
            }
            className="min-w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          >
            <option value="">Todos los años</option>
            {aniosDisponibles.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sesión actual
        </p>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-700">
          <span>
            Usuario: <strong>#{user?.id_usuario ?? '—'}</strong>
          </span>
          <span>
            Rol: <strong>{user?.rol ?? '—'}</strong>
          </span>
          <span>
            Establecimiento:{' '}
            <strong>
              {user?.id_establecimiento === null ||
              user?.id_establecimiento === undefined
                ? 'Todas las sedes'
                : `#${user.id_establecimiento}`}
            </strong>
          </span>
        </div>
      </div>

      {hasRole(user, GESTION_ROLES) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-brand-900">
              Supervisión y reportes
            </h2>
            <p className="mt-1 text-sm text-brand-800">
              Revisa el cumplimiento de plazos y la satisfacción ciudadana de
              todos los CESFAM de la comuna.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/panel/metricas"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Ver métricas por CESFAM
            </Link>
            <Link
              to="/panel/auditoria"
              className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              Ver auditoría
            </Link>
          </div>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          No se pudieron cargar los indicadores: {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => (
          <article
            key={indicador.etiqueta}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{indicador.etiqueta}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {cargando ? '…' : error ? '—' : indicador.valor}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Tasa de cumplimiento
        </h2>
        <p className="mt-1 text-3xl font-semibold text-brand-700">
          {cargando || error
            ? '—'
            : formatearPorcentaje(resumen?.tasa_cumplimiento ?? 100)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Porcentaje de requerimientos que no están vencidos. Un requerimiento
          se considera vencido cuando sigue abierto y su fecha límite ya pasó.
        </p>
      </section>
    </div>
  )
}
