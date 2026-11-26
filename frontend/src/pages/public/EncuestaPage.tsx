import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { getErrorMessage } from '../../services/api'
import {
  crearEncuesta,
  type DimensionEncuesta,
  type RespuestasEncuesta,
} from '../../services/encuestas'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'

const DIMENSIONES: { clave: DimensionEncuesta; titulo: string; ayuda: string }[] =
  [
    {
      clave: 'calidad_atencion',
      titulo: 'Calidad de la atención general',
      ayuda: 'Cómo evalúas la atención recibida en el establecimiento.',
    },
    {
      clave: 'tiempo_espera',
      titulo: 'Tiempo de espera',
      ayuda: 'Tiempo que esperaste para ser atendido(a).',
    },
    {
      clave: 'trato_personal',
      titulo: 'Trato recibido por el personal',
      ayuda: 'Amabilidad, respeto y disposición del equipo.',
    },
    {
      clave: 'presentacion_limpieza',
      titulo: 'Presentación y limpieza del personal',
      ayuda: 'Aseo e imagen del personal que te atendió.',
    },
    {
      clave: 'claridad_indicaciones',
      titulo: 'Claridad de las indicaciones',
      ayuda: '¿Entendiste las instrucciones y próximos pasos?',
    },
  ]

const ESCALA = [
  { valor: 1, etiqueta: 'Muy insatisfecho' },
  { valor: 2, etiqueta: 'Insatisfecho' },
  { valor: 3, etiqueta: 'Neutral' },
  { valor: 4, etiqueta: 'Satisfecho' },
  { valor: 5, etiqueta: 'Muy satisfecho' },
]

const RESPUESTAS_INICIALES: RespuestasEncuesta = {
  calidad_atencion: 0,
  tiempo_espera: 0,
  trato_personal: 0,
  presentacion_limpieza: 0,
  claridad_indicaciones: 0,
}

export function EncuestaPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  const [cargandoEstablecimientos, setCargandoEstablecimientos] = useState(true)
  const [errorEstablecimientos, setErrorEstablecimientos] = useState<string | null>(
    null,
  )
  const [recargar, setRecargar] = useState(0)

  const [establecimientoId, setEstablecimientoId] = useState('')
  const [respuestas, setRespuestas] =
    useState<RespuestasEncuesta>(RESPUESTAS_INICIALES)
  const [comentario, setComentario] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)
  const successRef = useRef<HTMLHeadingElement>(null)

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

  useEffect(() => {
    if (enviada) successRef.current?.focus()
  }, [enviada])

  function responder(clave: DimensionEncuesta, valor: number) {
    setRespuestas((actual) => ({ ...actual, [clave]: valor }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviando) return
    setError(null)

    if (!establecimientoId) {
      setError('Selecciona el establecimiento donde recibiste la atención.')
      return
    }

    const sinResponder = DIMENSIONES.filter(
      (dimension) => respuestas[dimension.clave] < 1,
    )
    if (sinResponder.length > 0) {
      setError(
        `Falta responder: ${sinResponder
          .map((dimension) => dimension.titulo.toLowerCase())
          .join(', ')}.`,
      )
      return
    }

    setEnviando(true)

    try {
      await crearEncuesta({
        id_establecimiento: Number(establecimientoId),
        datos_documento: {
          ...respuestas,
          ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
        },
      })
      setEnviada(true)
      window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setEnviando(false)
    }
  }

  function responderOtra() {
    setEnviada(false)
    setRespuestas(RESPUESTAS_INICIALES)
    setComentario('')
    setError(null)
  }

  if (enviada) {
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
          <h1
            ref={successRef}
            tabIndex={-1}
            className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none"
          >
            Gracias por tu opinión
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Tu respuesta fue registrada de forma anónima. Nos ayuda a mejorar la
            atención de nuestro CESFAM.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Volver al portal
            </Link>
            <button
              type="button"
              onClick={responderOtra}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Responder otra encuesta
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Encuesta de satisfacción
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Tu opinión es voluntaria y completamente anónima. No solicitamos
          nombre, RUT ni datos de contacto.
        </p>

        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
          Responde pensando en la atención que recibiste. Usa una escala de 1
          (muy insatisfecho) a 5 (muy satisfecho).
        </div>

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
              aria-invalid={error && !establecimientoId ? true : undefined}
              aria-describedby={
                error && !establecimientoId ? 'encuesta-error' : undefined
              }
              value={establecimientoId}
              onChange={(event) => setEstablecimientoId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
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

          <div className="space-y-5">
            {DIMENSIONES.map((dimension) => (
              <fieldset
                key={dimension.clave}
                aria-describedby={`dim-${dimension.clave}-ayuda`}
                aria-invalid={
                  error?.startsWith('Falta responder') &&
                  respuestas[dimension.clave] < 1
                    ? true
                    : undefined
                }
                className="rounded-xl border border-slate-200 p-4"
              >
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  {dimension.titulo}
                </legend>
                <p
                  id={`dim-${dimension.clave}-ayuda`}
                  className="mt-1 text-xs text-slate-500"
                >
                  {dimension.ayuda}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {ESCALA.map((opcion) => {
                    const activo =
                      respuestas[dimension.clave] === opcion.valor
                    return (
                      <label
                        key={opcion.valor}
                        className={[
                          'flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1',
                          activo
                            ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50/40',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name={dimension.clave}
                          value={opcion.valor}
                          checked={activo}
                          onChange={() =>
                            responder(dimension.clave, opcion.valor)
                          }
                          className="sr-only"
                          required
                        />
                        <span className="text-base font-semibold">
                          {opcion.valor}
                        </span>
                        <span>{opcion.etiqueta}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div>
            <label
              htmlFor="comentario"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Comentarios adicionales{' '}
              <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              name="comentario"
              rows={4}
              maxLength={1000}
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              placeholder="Si lo deseas, cuéntanos qué podríamos mejorar."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-600">
              {comentario.length}/1000
            </p>
          </div>

          {error && (
            <div
              id="encuesta-error"
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              No pediremos datos personales. La encuesta es anónima.
            </p>
            <button
              type="submit"
              aria-busy={enviando}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {enviando ? 'Enviando…' : 'Enviar encuesta'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
