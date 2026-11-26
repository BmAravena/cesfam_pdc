import { Link, NavLink, Outlet } from 'react-router-dom'

import { SkipLink } from '../components/SkipLink'

const currentYear = new Date().getFullYear()

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

/** Layout de las vistas públicas: Portal Ciudadano. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/logo cesfam.jpg"
              alt="Departamento de Salud Municipal de Padre Las Casas"
              className="h-12 w-auto max-w-[250px] object-contain"
            />
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 md:flex"
          >
            <NavLink to="/" end className={navLinkClass}>
              Portal ciudadano
            </NavLink>
            <NavLink to="/solicitud" className={navLinkClass}>
              Ingresar requerimiento
            </NavLink>
            <NavLink to="/consulta" className={navLinkClass}>
              Consultar estado
            </NavLink>
            <NavLink to="/encuesta" className={navLinkClass}>
              Encuesta de satisfacción
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Acceso funcionarios
            </NavLink>
          </nav>

          <Link
            to="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 md:hidden"
          >
            Funcionarios
          </Link>
        </div>
      </header>

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} CESFAM Padre Las Casas</p>
          <p>Sistema OIRS · Oficina de Informaciones, Reclamos y Sugerencias</p>
        </div>
      </footer>
    </div>
  )
}
