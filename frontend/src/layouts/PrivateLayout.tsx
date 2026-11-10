import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../features/auth/useAuth'
import { hasRole } from '../lib/auth'
import { GESTION_ROLES } from '../lib/roles'

interface NavItem {
  to: string
  label: string
  end?: boolean
  roles?: readonly string[]
}

const navItems: NavItem[] = [
  { to: '/panel', label: 'Panel', end: true },
  { to: '/panel/requerimientos', label: 'Requerimientos' },
  { to: '/panel/usuarios', label: 'Usuarios', roles: GESTION_ROLES },
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
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <Link to="/panel" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="size-5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">
                OIRS · Panel interno
              </span>
              <span className="block text-xs text-slate-500">
                Salud Padre Las Casas
              </span>
            </span>
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

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
