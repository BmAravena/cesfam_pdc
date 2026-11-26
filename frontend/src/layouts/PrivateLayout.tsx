import { Link, NavLink, Outlet } from 'react-router-dom'

import { SkipLink } from '../components/SkipLink'
import { useAuth } from '../features/auth/useAuth'
import { hasRole } from '../lib/auth'
import { ADMIN_ONLY, GESTION_ROLES } from '../lib/roles'

interface NavItem {
  to: string
  label: string
  end?: boolean
  roles?: readonly string[]
}

const navItems: NavItem[] = [
  { to: '/panel', label: 'Panel', end: true },
  { to: '/panel/requerimientos', label: 'Requerimientos' },
  { to: '/panel/metricas', label: 'Métricas' },
  { to: '/panel/usuarios', label: 'Usuarios', roles: ADMIN_ONLY },
  {
    to: '/panel/establecimientos',
    label: 'Establecimientos',
    roles: ADMIN_ONLY,
  },
  { to: '/panel/auditoria', label: 'Auditoría', roles: GESTION_ROLES },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ')

/** Layout del panel interno de funcionarios. */
export function PrivateLayout() {
  const { user, logout } = useAuth()

  const visibleItems = navItems.filter(
    (item) => !item.roles || hasRole(user, item.roles),
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <SkipLink />
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <Link to="/panel" className="flex items-center gap-3">
            <img
              src="/images/logo cesfam.jpg"
              alt="Departamento de Salud Municipal de Padre Las Casas"
              className="h-12 w-auto max-w-[250px] object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">
                Usuario #{user?.id_usuario ?? '—'}
              </p>
              <p className="text-xs text-slate-500">{user?.rol ?? 'Sin rol'}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Navegación móvil */}
        <nav
          aria-label="Navegación del panel"
          className="flex gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 lg:hidden"
        >
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 bg-slate-900 p-4 lg:block">
          <nav aria-label="Navegación del panel" className="space-y-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <p className="mt-6 rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-400">
            Acceso restringido. Todas las acciones quedan registradas en la
            auditoría del sistema.
          </p>
        </aside>

        <main
          id="contenido-principal"
          tabIndex={-1}
          className="min-w-0 flex-1 p-4 focus:outline-none lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
