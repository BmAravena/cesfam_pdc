import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        Página no encontrada
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        La dirección que intentaste abrir no existe o fue movida.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        Ir al portal ciudadano
      </Link>
    </section>
  )
}
