import { Outlet } from 'react-router-dom'

import { RouteAnnouncer } from '../components/RouteAnnouncer'
import { AuthProvider } from '../features/auth/AuthProvider'

/** Layout raíz: provee el estado de autenticación y los anuncios de ruta. */
export function RootLayout() {
  return (
    <AuthProvider>
      <RouteAnnouncer />
      <Outlet />
    </AuthProvider>
  )
}
