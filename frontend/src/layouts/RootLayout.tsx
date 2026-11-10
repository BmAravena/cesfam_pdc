import { Outlet } from 'react-router-dom'

import { AuthProvider } from '../features/auth/AuthProvider'

/** Layout raíz: provee el estado de autenticación a todo el árbol de rutas. */
export function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
