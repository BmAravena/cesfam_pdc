import { Link } from 'react-router-dom'

const pasos = [
  {
    titulo: 'Ingresa tu requerimiento',
    detalle:
      'Registra tu solicitud, reclamo o sugerencia indicando el establecimiento y tus datos de contacto.',
  },
  {
    titulo: 'Sigue su estado',
    detalle:
      'Consulta el avance de tu caso con el número de requerimiento entregado al momento del ingreso.',
  },
  {
    titulo: 'Recibe una respuesta',
    detalle:
      'El equipo OIRS gestiona tu caso y te informa la resolución dentro de los plazos establecidos.',
  },
]

export function PortalPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,157,128,0.35),transparent_55%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-brand-100">
              Oficina de Informaciones, Reclamos y Sugerencias
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Tu voz mejora nuestra salud
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
              Canal oficial del CESFAM Padre Las Casas para presentar
              solicitudes, reclamos, sugerencias y felicitaciones. Haz seguimiento
              de tu caso en línea, de forma simple y transparente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/solicitud"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
              >
                Ingresar requerimiento
              </Link>
              <Link
                to="/consulta"
                className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Consultar estado
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-100">
              Horario de atención
            </h2>
            <dl className="mt-4 space-y-3 text-sm text-white">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-brand-100">Lunes a jueves</dt>
                <dd className="font-medium">08:00 – 16:30</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-brand-100">Viernes</dt>
                <dd className="font-medium">08:00 – 15:30</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-brand-100">Teléfono</dt>
                <dd className="font-medium">(45) 2 000 000</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-brand-200">
              Para urgencias médicas acude al servicio de urgencia más cercano o
              llama al 131.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            ¿Cómo funciona?
          </h2>
          <p className="mt-2 text-slate-600">
            Un proceso claro, desde el ingreso de tu requerimiento hasta la
            respuesta del equipo OIRS.
          </p>
        </div>

        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {pasos.map((paso, index) => (
            <li
              key={paso.titulo}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {paso.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {paso.detalle}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
