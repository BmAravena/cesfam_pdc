import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../features/auth/useAuth'
import { hasRole } from '../lib/auth'

interface RequireAuthProps {
  /** Si se omite, basta con tener una sesión válida. */
  allowedRoles?: readonly string[]
}

/**
 * Ruta protegida: exige un JWT válido y, opcionalmente, un rol permitido.
 * Se usa como layout route (<Route element={<RequireAuth />}>).
 */
export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return <Navigate to="/panel" replace />
  }

  return <Outlet />
}
