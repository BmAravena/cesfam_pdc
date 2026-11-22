import { useEffect, useState, type FormEvent } from 'react'

import { getErrorMessage } from '../../services/api'
import {
  actualizarEstablecimiento,
  crearEstablecimiento,
  eliminarEstablecimiento,
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'

interface FormularioEstado {
  nombre_centro: string
  tipo_centro: string
}

const FORMULARIO_VACIO: FormularioEstado = {
  nombre_centro: '',
  tipo_centro: '',
}

export function EstablecimientosPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [formulario, setFormulario] = useState<FormularioEstado | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [accionandoId, setAccionandoId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let activo = true

    setCargando(true)
    listarEstablecimientos()
      .then((data) => {
        if (activo) setEstablecimientos(data)
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

  function abrirNuevo() {
    setEditandoId(null)
    setFormulario({ ...FORMULARIO_VACIO })
    setError(null)
    setExito(null)
  }

  function abrirEdicion(establecimiento: Establecimiento) {
    setEditandoId(establecimiento.id_establecimiento)
    setFormulario({
      nombre_centro: establecimiento.nombre_centro,
      tipo_centro: establecimiento.tipo_centro,
    })
    setError(null)
    setExito(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formulario) return

    setGuardando(true)
    setError(null)
    setExito(null)

    try {
      if (editandoId === null) {
        const creado = await crearEstablecimiento(formulario)
        setExito(`Establecimiento "${creado.nombre_centro}" creado.`)
      } else {
        const actualizado = await actualizarEstablecimiento(
          editandoId,
          formulario,
        )
        setExito(
          `Establecimiento "${actualizado.nombre_centro}" actualizado.`,
        )
      }
      setFormulario(null)
      setEditandoId(null)
      setCargando(true)
      setRecargar((valor) => valor + 1)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(establecimiento: Establecimiento) {
    const confirmado = window.confirm(
      `¿Eliminar "${establecimiento.nombre_centro}"? Solo es posible si no tiene usuarios, requerimientos ni encuestas asociadas.`,
    )
    if (!confirmado) return

    setAccionandoId(establecimiento.id_establecimiento)
    setError(null)
    setExito(null)

    try {
      await eliminarEstablecimiento(establecimiento.id_establecimiento)
      setExito(`Establecimiento "${establecimiento.nombre_centro}" eliminado.`)
      if (editandoId === establecimiento.id_establecimiento) {
        setFormulario(null)
        setEditandoId(null)
      }
      setCargando(true)
      setRecargar((valor) => valor + 1)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setAccionandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Establecimientos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Administra los centros de salud que forman parte de la red OIRS
            comunal.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Nuevo establecimiento
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {exito && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800"
        >
          {exito}
        </p>
      )}

      {formulario && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            {editandoId === null
              ? 'Crear establecimiento'
              : `Editar establecimiento #${editandoId}`}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Nombre del centro
              <input
                required
                maxLength={120}
                value={formulario.nombre_centro}
                onChange={(event) =>
                  setFormulario({
                    ...formulario,
                    nombre_centro: event.target.value,
                  })
                }
                placeholder="CESFAM Padre Las Casas"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Tipo de centro
              <input
                required
                maxLength={60}
                value={formulario.tipo_centro}
                onChange={(event) =>
                  setFormulario({
                    ...formulario,
                    tipo_centro: event.target.value,
                  })
                }
                placeholder="CESFAM Urbano"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setFormulario(null)
                setEditandoId(null)
              }}
              disabled={guardando}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? 'Guardando…'
                : editandoId === null
                  ? 'Crear'
                  : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Cargando establecimientos…
                  </td>
                </tr>
              ) : establecimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    No hay establecimientos registrados.
                  </td>
                </tr>
              ) : (
                establecimientos.map((establecimiento) => (
                  <tr key={establecimiento.id_establecimiento}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      #{establecimiento.id_establecimiento}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {establecimiento.nombre_centro}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {establecimiento.tipo_centro}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(establecimiento)}
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(establecimiento)}
                          disabled={
                            accionandoId === establecimiento.id_establecimiento
                          }
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {accionandoId === establecimiento.id_establecimiento
                            ? 'Eliminando…'
                            : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Solo el Administrador del Sistema puede crear, editar o eliminar
        establecimientos. Un centro con datos asociados no puede eliminarse.
      </p>
    </div>
  )
}
