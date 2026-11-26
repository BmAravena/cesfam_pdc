import { useEffect, useRef, useState, type FormEvent } from 'react'

import { getErrorMessage } from '../../services/api'
import {
  cambiarEstadoRequerimiento,
  responderRequerimiento,
  type EstadoRequerimiento,
  type RequerimientoResponse,
} from '../../services/requerimientos'

interface ResponderModalProps {
  requerimiento: RequerimientoResponse
  onClose: () => void
  onResponded: (mensaje?: string) => void
}

const ESTADOS_GESTION: EstadoRequerimiento[] = [
  'En Proceso',
  'Cerrado',
  'Rechazado',
]

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(
    new Date(`${fecha.slice(0, 10)}T00:00:00`),
  )
}

export function ResponderModal({
  requerimiento,
  onClose,
  onResponded,
}: ResponderModalProps) {
  const [respuesta, setRespuesta] = useState(requerimiento.respuesta ?? '')
  const [enviando, setEnviando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] =
    useState<EstadoRequerimiento | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const respuestaRef = useRef<HTMLTextAreaElement>(null)
  const editarRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Accesibilidad del diálogo: foco inicial, Escape, trampa de foco y
  // devolución del foco al elemento que lo abrió.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => element.getClientRects().length > 0,
      )

    dialog.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const elements = focusables()
      if (elements.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement

      // Si el foco quedó fuera del diálogo, lo devolvemos adentro.
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault()
        first.focus()
        return
      }

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [])

  const editable =
    requerimiento.estado !== 'Cerrado' &&
    requerimiento.estado !== 'Rechazado'

  const respuestaGuardada = (requerimiento.respuesta ?? '').trim()
  const tieneRespuesta = respuestaGuardada.length > 0
  const enEdicion = editable && (editando || !tieneRespuesta)

  // Al entrar en modo edición llevamos el foco al área de texto.
  useEffect(() => {
    if (editando) respuestaRef.current?.focus()
  }, [editando])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviando || cambiandoEstado !== null) return
    if (!respuesta.trim()) return

    setEnviando(true)
    setError(null)

    try {
      await responderRequerimiento(requerimiento.id_requerimiento, respuesta.trim())
      onResponded(
        tieneRespuesta
          ? 'Respuesta actualizada. El requerimiento sigue en estado Respondido.'
          : 'Respuesta guardada. El requerimiento quedó en estado Respondido.',
      )
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setEnviando(false)
    }
  }

  async function handleCambiarEstado(nuevoEstado: EstadoRequerimiento) {
    if (cambiandoEstado !== null) return
    if (nuevoEstado === requerimiento.estado) return

    if (nuevoEstado === 'Cerrado' || nuevoEstado === 'Rechazado') {
      const confirmado = window.confirm(
        `¿Cambiar el requerimiento a "${nuevoEstado}"? Esta acción quedará registrada en la auditoría.`,
      )
      if (!confirmado) return
    }

    setCambiandoEstado(nuevoEstado)
    setError(null)

    try {
      await cambiarEstadoRequerimiento(
        requerimiento.id_requerimiento,
        nuevoEstado,
      )
      onResponded(`Requerimiento actualizado a "${nuevoEstado}".`)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setCambiandoEstado(null)
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="responder-titulo"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2
              id="responder-titulo"
              className="text-lg font-semibold text-slate-900"
            >
              {editable ? 'Gestionar requerimiento' : 'Detalle del requerimiento'}
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {requerimiento.codigo_seguimiento}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Tipo</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {requerimiento.tipo_solicitud}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Ingreso</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatearFecha(requerimiento.fecha_ingreso)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Estado</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {requerimiento.estado}
              </dd>
            </div>
          </dl>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Detalle de la solicitud
            </p>
            <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
              {requerimiento.detalle_solicitud}
            </div>
          </div>

          {editable && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Cambiar estado
              </p>
              <div
                className="flex flex-wrap gap-2"
                aria-busy={cambiandoEstado !== null}
              >
                {ESTADOS_GESTION.map((estado) => {
                  if (requerimiento.estado === estado) {
                    return (
                      <span
                        key={estado}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800"
                      >
                        {estado} (actual)
                      </span>
                    )
                  }

                  return (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => handleCambiarEstado(estado)}
                      aria-busy={cambiandoEstado === estado}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {cambiandoEstado === estado ? 'Guardando…' : estado}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Responder el requerimiento lo deja automáticamente en estado
                Respondido.
              </p>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              {enEdicion ? (
                <label
                  htmlFor="respuesta"
                  className="block text-sm font-medium text-slate-700"
                >
                  Respuesta al ciudadano
                </label>
              ) : (
                <p className="block text-sm font-medium text-slate-700">
                  Respuesta al ciudadano
                </p>
              )}
              {editable && tieneRespuesta && !enEdicion && (
                <button
                  type="button"
                  ref={editarRef}
                  onClick={() => setEditando(true)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Editar respuesta
                </button>
              )}
            </div>

            {enEdicion ? (
              <>
                <textarea
                  ref={respuestaRef}
                  id="respuesta"
                  rows={6}
                  maxLength={5000}
                  required
                  value={respuesta}
                  onChange={(event) => setRespuesta(event.target.value)}
                  placeholder="Escribe la respuesta que verá el ciudadano en la consulta pública."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {respuesta.length}/5000
                </p>
              </>
            ) : (
              <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {tieneRespuesta
                  ? respuestaGuardada
                  : 'Aún no hay una respuesta registrada para este requerimiento.'}
              </div>
            )}
          </div>

          {!editable && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {requerimiento.estado === 'Cerrado'
                ? 'El caso está cerrado y su respuesta ya no se puede modificar.'
                : 'Este requerimiento fue rechazado, por lo que no admite respuesta.'}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (enEdicion && tieneRespuesta) {
                  setRespuesta(respuestaGuardada)
                  setEditando(false)
                  setError(null)
                  requestAnimationFrame(() => editarRef.current?.focus())
                  return
                }
                onClose()
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {enEdicion
                ? tieneRespuesta
                  ? 'Cancelar edición'
                  : 'Cancelar'
                : 'Cerrar'}
            </button>
            {enEdicion && (
              <button
                type="submit"
                aria-busy={enviando}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {enviando
                  ? 'Guardando…'
                  : tieneRespuesta
                    ? 'Guardar cambios'
                    : 'Guardar respuesta'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
