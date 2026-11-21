import { useEffect, useState } from 'react'

import { useAuth } from '../../features/auth/useAuth'
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

  const [resumen, setResumen] = useState<RequerimientoResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    setCargando(true)
    setError(null)

    obtenerResumenRequerimientos()
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
  }, [])

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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Panel de control
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Resumen operativo de la oficina OIRS para tu establecimiento.
        </p>
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
            Establecimiento: <strong>#{user?.id_establecimiento ?? '—'}</strong>
          </span>
        </div>
      </div>

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
