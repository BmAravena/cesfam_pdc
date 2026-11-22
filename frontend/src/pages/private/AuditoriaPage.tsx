import { useEffect, useState } from 'react'

import { descargarCsv } from '../../lib/csv'
import { getErrorMessage } from '../../services/api'
import {
  listarAuditoria,
  type AuditoriaLog,
} from '../../services/auditoria'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'

function formatearFechaHora(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

export function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([])
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [establecimientoId, setEstablecimientoId] = useState<number | ''>('')
  const [accion, setAccion] = useState('')
  const [limite, setLimite] = useState(100)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let activo = true

    listarEstablecimientos()
      .then((data) => {
        if (activo) setEstablecimientos(data)
      })
      .catch(() => {
        // El filtro por sede es opcional; si falla el catálogo, se ignora.
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true
    const params = {
      limit: limite,
      ...(establecimientoId ? { id_establecimiento: establecimientoId } : {}),
      ...(accion.trim() ? { accion: accion.trim() } : {}),
    }

    setCargando(true)
    setError(null)

    listarAuditoria(params)
      .then((data) => {
        if (activo) setLogs(data)
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
  }, [establecimientoId, accion, limite, recargar])

  const nombrePorId = new Map(
    establecimientos.map((establecimiento) => [
      establecimiento.id_establecimiento,
      establecimiento.nombre_centro,
    ]),
  )

  function handleExportar() {
    descargarCsv(
      `auditoria-${new Date().toISOString().slice(0, 10)}`,
      [
        ['Fecha y hora', 'Usuario', 'Establecimiento', 'Acción', 'IP origen'],
        ...logs.map((log) => [
          formatearFechaHora(log.timestamp),
          log.id_usuario === null ? 'Sistema / público' : `Usuario #${log.id_usuario}`,
          log.id_establecimiento === null
            ? ''
            : (nombrePorId.get(log.id_establecimiento) ??
              `Sede #${log.id_establecimiento}`),
          log.accion,
          log.ip_origen,
        ]),
      ],
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Auditoría
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Trazabilidad de las acciones realizadas en el sistema. La bitácora es
          inmutable y se ordena desde el evento más reciente.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acción contiene
          <input
            value={accion}
            maxLength={150}
            onChange={(event) => setAccion(event.target.value)}
            placeholder="CAMBIO_ESTADO, RESPUESTA…"
            className="min-w-52 rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Registros
          <select
            value={limite}
            onChange={(event) => setLimite(Number(event.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          >
            {[50, 100, 200].map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleExportar}
          disabled={cargando || logs.length === 0}
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
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          No se pudo cargar la bitácora: {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Establecimiento</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">IP origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Cargando bitácora…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No hay registros para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id_log} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatearFechaHora(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.id_usuario === null
                        ? 'Sistema / público'
                        : `Usuario #${log.id_usuario}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.id_establecimiento === null
                        ? '—'
                        : (nombrePorId.get(log.id_establecimiento) ??
                          `Sede #${log.id_establecimiento}`)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {log.accion}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {log.ip_origen ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Visible para Administrador del Sistema y Encargado OIRS Comunal. Los
        registros no se pueden editar ni eliminar.
      </p>
    </div>
  )
}
