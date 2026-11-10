import { useState, type FormEvent } from 'react'

export function ConsultaPage() {
  const [codigo, setCodigo] = useState('')
  const [consultado, setConsultado] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO: conectar con el endpoint público de seguimiento cuando exista.
    setConsultado(true)
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Consultar estado de un requerimiento
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Ingresa el número de requerimiento que recibiste al momento de
          registrar tu solicitud.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label
              htmlFor="codigo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Número de requerimiento
            </label>
            <input
              id="codigo"
              name="codigo"
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value)
                setConsultado(false)
              }}
              placeholder="Ej: OIRS-2026-000123"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-fit self-end rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:self-auto"
          >
            Consultar
          </button>
        </form>

        {consultado && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900"
          >
            La consulta pública estará disponible cuando se habilite el endpoint
            de seguimiento en la API. Por ahora puedes comunicarte con la oficina
            OIRS del CESFAM.
          </div>
        )}
      </div>
    </section>
  )
}
