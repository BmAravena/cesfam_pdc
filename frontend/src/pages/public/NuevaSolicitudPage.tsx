import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { getErrorMessage } from '../../services/api'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'
import {
  crearRequerimiento,
  type RequerimientoResponse,
} from '../../services/requerimientos'

const TIPOS_SOLICITUD = ['Solicitud', 'Reclamo', 'Sugerencia', 'Felicitación']

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(
    new Date(`${fecha}T00:00:00`),
  )
}

export function NuevaSolicitudPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [cargandoEstablecimientos, setCargandoEstablecimientos] = useState(true)
  const [errorEstablecimientos, setErrorEstablecimientos] = useState<string | null>(
    null,
  )
  const [recargar, setRecargar] = useState(0)

  const [tipo, setTipo] = useState('Solicitud')
  const [establecimientoId, setEstablecimientoId] = useState('')
  const [detalle, setDetalle] = useState('')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [esAnonimo, setEsAnonimo] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creado, setCreado] = useState<RequerimientoResponse | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let activo = true

    listarEstablecimientos()
      .then((data) => {
        if (!activo) return
        setEstablecimientos(data)
        if (data.length === 1) {
          setEstablecimientoId(String(data[0].id_establecimiento))
        }
      })
      .catch((requestError) => {
        if (activo) setErrorEstablecimientos(getErrorMessage(requestError))
      })
      .finally(() => {
        if (activo) setCargandoEstablecimientos(false)
      })

    return () => {
      activo = false
    }
  }, [recargar])

  function reintentarEstablecimientos() {
    setCargandoEstablecimientos(true)
    setErrorEstablecimientos(null)
    setRecargar((valor) => valor + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      // El backend guarda el detalle como texto libre: para los ingresos
      // identificados anteponemos los datos de contacto para que OIRS pueda
      // responder. Lo ideal a futuro es agregar campos dedicados al esquema.
      const detalleFinal = esAnonimo
        ? detalle.trim()
        : `Solicitante: ${nombre.trim()}\nContacto: ${contacto.trim()}\n\n${detalle.trim()}`

      const data = await crearRequerimiento({
        tipo_solicitud: tipo,
        detalle_solicitud: detalleFinal,
        es_anonimo: esAnonimo,
        id_establecimiento: Number(establecimientoId),
      })

      setCreado(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setEnviando(false)
    }
  }

  async function copiarCodigo() {
    if (!creado) return

    try {
      await navigator.clipboard.writeText(creado.codigo_seguimiento)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Si el navegador bloquea el portapapeles, el código sigue visible.
    }
  }

  function registrarOtro() {
    setCreado(null)
    setDetalle('')
    setNombre('')
    setContacto('')
    setEsAnonimo(false)
    setTipo('Solicitud')
  }

  if (creado) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <div className="rounded-2xl border border-brand-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-brand-700">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Requerimiento ingresado
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Guarda este código: lo necesitarás para consultar el estado de tu
            caso.
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Código de seguimiento
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
              {creado.codigo_seguimiento}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fecha límite de respuesta: {formatearFecha(creado.fecha_limite)}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={copiarCodigo}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {copiado ? 'Código copiado' : 'Copiar código'}
            </button>
            <Link
              to={`/consulta?codigo=${encodeURIComponent(creado.codigo_seguimiento)}`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Consultar estado
            </Link>
          </div>

          <button
            type="button"
            onClick={registrarOtro}
            className="mt-6 text-sm font-medium text-brand-700 hover:underline"
          >
            Ingresar otro requerimiento
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Ingresar un requerimiento
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Completa el formulario para registrar tu solicitud, reclamo, sugerencia
          o felicitación. Recibirás un código para hacer seguimiento.
        </p>

        {errorEstablecimientos && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <span>{errorEstablecimientos}</span>
            <button
              type="button"
              onClick={reintentarEstablecimientos}
              className="font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="tipo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tipo de requerimiento
            </label>
            <select
              id="tipo"
              name="tipo"
              required
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              {TIPOS_SOLICITUD.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="establecimiento"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Establecimiento
            </label>
            <select
              id="establecimiento"
              name="establecimiento"
              required
              disabled={cargandoEstablecimientos || establecimientos.length === 0}
              value={establecimientoId}
              onChange={(event) => setEstablecimientoId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">
                {cargandoEstablecimientos
                  ? 'Cargando establecimientos…'
                  : 'Selecciona un establecimiento'}
              </option>
              {establecimientos.map((establecimiento) => (
                <option
                  key={establecimiento.id_establecimiento}
                  value={establecimiento.id_establecimiento}
                >
                  {establecimiento.nombre_centro}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={esAnonimo}
                onChange={(event) => setEsAnonimo(event.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                Quiero ingresar mi requerimiento de forma anónima
                <span className="mt-1 block text-xs text-slate-500">
                  Si es anónimo no podremos contactarte para responder, pero el
                  caso será gestionado igualmente.
                </span>
              </span>
            </label>
          </div>

          {!esAnonimo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="nombre"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Nombre completo
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="contacto"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Correo o teléfono
                </label>
                <input
                  id="contacto"
                  name="contacto"
                  type="text"
                  required
                  placeholder="ejemplo@correo.cl o +56 9 1234 5678"
                  value={contacto}
                  onChange={(event) => setContacto(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="detalle"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Detalle
            </label>
            <textarea
              id="detalle"
              name="detalle"
              required
              minLength={10}
              rows={6}
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              placeholder="Describe lo ocurrido con el mayor detalle posible: fecha, lugar, personas involucradas y lo que esperas como respuesta."
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Mínimo 10 caracteres. No incluyas datos sensibles de terceros.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Volver al portal
            </Link>
            <button
              type="submit"
              disabled={enviando || establecimientos.length === 0}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Ingresar requerimiento'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
