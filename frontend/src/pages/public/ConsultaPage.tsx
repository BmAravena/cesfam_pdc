import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { getErrorMessage } from '../../services/api'
import {
  consultarSeguimiento,
  type EstadoRequerimiento,
  type RequerimientoPublicoResponse,
} from '../../services/requerimientos'

const estadoEstilos: Record<EstadoRequerimiento, string> = {
  Ingresado: 'bg-slate-100 text-slate-700',
  'En Proceso': 'bg-amber-100 text-amber-800',
  Respondido: 'bg-accent-100 text-accent-800',
  Cerrado: 'bg-brand-100 text-brand-800',
  Rechazado: 'bg-red-100 text-red-800',
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(
    new Date(`${fecha}T00:00:00`),
  )
}

export function ConsultaPage() {
  const [searchParams] = useSearchParams()
  const codigoInicial = searchParams.get('codigo')?.trim() ?? ''

  const [codigo, setCodigo] = useState(codigoInicial)
  const [resultado, setResultado] = useState<RequerimientoPublicoResponse | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(codigoInicial !== '')

  useEffect(() => {
    if (!codigoInicial) return

    let activo = true

    consultarSeguimiento(codigoInicial)
      .then((data) => {
        if (activo) setResultado(data)
      })
      .catch((requestError) => {
        if (activo) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (activo) setBuscando(false)
      })

    return () => {
      activo = false
    }
  }, [codigoInicial])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valor = codigo.trim()
    if (!valor) return

    setBuscando(true)
    setError(null)
    setResultado(null)

    try {
      setResultado(await consultarSeguimiento(valor))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Consultar estado de un requerimiento
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Ingresa el código de seguimiento que recibiste al momento de registrar
          tu solicitud.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label
              htmlFor="codigo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Código de seguimiento
            </label>
            <input
              id="codigo"
              name="codigo"
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value)
                setResultado(null)
                setError(null)
              }}
              placeholder="Ej: OIRS-20261110-A1B2C3"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-900 shadow-sm uppercase placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="h-fit self-end rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {buscando ? 'Consultando…' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {resultado && (
          <article className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Código
                </p>
                <p className="font-mono text-lg font-semibold text-slate-900">
                  {resultado.codigo_seguimiento}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  estadoEstilos[resultado.estado]
                }`}
              >
                {resultado.estado}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Tipo</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {resultado.tipo_solicitud}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Fecha de ingreso</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {formatearFecha(resultado.fecha_ingreso)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Plazo de respuesta</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {formatearFecha(resultado.fecha_limite)}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Por protección de datos, el detalle del requerimiento no se muestra
              en la consulta pública.
            </p>
          </article>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          ¿Aún no tienes un código?{' '}
          <Link to="/solicitud" className="font-semibold text-brand-700 hover:underline">
            Ingresa tu requerimiento aquí
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
