import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import { ResponderModal } from '../../features/requerimientos/ResponderModal'
import { hasRole } from '../../lib/auth'
import { GESTION_ROLES } from '../../lib/roles'
import { getErrorMessage } from '../../services/api'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'
import {
  listarRequerimientos,
  obtenerRequerimiento,
  type EstadoRequerimiento,
  type RequerimientoListItem,
  type RequerimientoResponse,
} from '../../services/requerimientos'

const ESTADO_CLASSES: Record<EstadoRequerimiento, string> = {
  Ingresado: 'bg-sky-50 text-sky-700 ring-sky-200',
  'En Proceso': 'bg-amber-50 text-amber-700 ring-amber-200',
  Respondido: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cerrado: 'bg-slate-100 text-slate-700 ring-slate-200',
  Rechazado: 'bg-red-50 text-red-700 ring-red-200',
}

const ESTADOS: EstadoRequerimiento[] = [
  'Ingresado',
  'En Proceso',
  'Respondido',
  'Cerrado',
  'Rechazado',
]

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}-${mes}-${anio}`
}

function etiquetaAccion(estado: EstadoRequerimiento): string {
  if (estado === 'Respondido' || estado === 'Cerrado') return 'Ver respuesta'
  if (estado === 'Rechazado') return 'Ver detalle'
  return 'Gestionar'
}

export function RequerimientosPage() {
  const { user } = useAuth()
  const puedeFiltrarSede = hasRole(user, GESTION_ROLES)

  const [requerimientos, setRequerimientos] = useState<RequerimientoListItem[]>(
    [],
  )
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [estado, setEstado] = useState<EstadoRequerimiento | ''>('')
  const [establecimientoId, setEstablecimientoId] = useState<number | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)
  const [seleccionado, setSeleccionado] =
    useState<RequerimientoResponse | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null)

  useEffect(() => {
    let activo = true

    listarEstablecimientos()
      .then((data) => {
        if (activo) setEstablecimientos(data)
      })
      .catch(() => {
        // El filtro por sede es opcional; el listado funciona sin el catálogo.
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true

    setCargando(true)
    setError(null)

    listarRequerimientos({
      limit: 200,
      ...(estado ? { estado } : {}),
      ...(establecimientoId ? { establecimiento_id: establecimientoId } : {}),
    })
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
  }, [estado, establecimientoId, recargar])

  function handleUpdated(mensaje?: string) {
    setSeleccionado(null)
    setExito(mensaje ?? 'Requerimiento actualizado correctamente.')
    setRecargar((valor) => valor + 1)
  }

  async function abrirDetalle(requerimiento: RequerimientoListItem) {
    setExito(null)
    setError(null)
    setCargandoDetalle(requerimiento.id_requerimiento)

    try {
      setSeleccionado(await obtenerRequerimiento(requerimiento.id_requerimiento))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setCargandoDetalle(null)
    }
  }

  const hayFiltros = estado !== '' || establecimientoId !== ''

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Requerimientos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Bandeja de solicitudes, reclamos, sugerencias y felicitaciones.
            {!puedeFiltrarSede && ' Solo se muestran los casos de tu CESFAM.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setExito(null)
              setRecargar((valor) => valor + 1)
            }}
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

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Estado
          <select
            value={estado}
            onChange={(event) =>
              setEstado(event.target.value as EstadoRequerimiento | '')
            }
            className="min-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

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

        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setEstado('')
              setEstablecimientoId('')
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          No se pudieron cargar los requerimientos: {error}
        </div>
      )}

      {exito && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          {exito}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Código
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  CESFAM
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
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando requerimientos…
                  </td>
                </tr>
              ) : requerimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay requerimientos para el filtro seleccionado.
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
                      {requerimiento.nombre_centro}
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
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(requerimiento)}
                        disabled={cargandoDetalle === requerimiento.id_requerimiento}
                        className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cargandoDetalle === requerimiento.id_requerimiento
                          ? 'Cargando…'
                          : etiquetaAccion(requerimiento.estado)}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!cargando && requerimientos.length > 0 && (
        <p className="text-xs text-slate-500">
          Mostrando {requerimientos.length} requerimiento
          {requerimientos.length === 1 ? '' : 's'}
          {establecimientoId
            ? ` de ${
                establecimientos.find(
                  (item) =>
                    item.id_establecimiento === establecimientoId,
                )?.nombre_centro ?? 'la sede seleccionada'
              }`
            : ''}
          .
        </p>
      )}

      {seleccionado && (
        <ResponderModal
          requerimiento={seleccionado}
          onClose={() => setSeleccionado(null)}
          onResponded={handleUpdated}
        />
      )}
    </div>
  )
}
