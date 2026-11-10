import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '../components/RequireAuth'
import { LoginPage } from '../features/auth/LoginPage'
import { PrivateLayout } from '../layouts/PrivateLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { RootLayout } from '../layouts/RootLayout'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AuditoriaPage } from '../pages/private/AuditoriaPage'
import { DashboardPage } from '../pages/private/DashboardPage'
import { RequerimientosPage } from '../pages/private/RequerimientosPage'
import { UsuariosPage } from '../pages/private/UsuariosPage'
import { ConsultaPage } from '../pages/public/ConsultaPage'
import { PortalPage } from '../pages/public/PortalPage'
import { GESTION_ROLES, PANEL_ROLES } from '../lib/roles'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // --- Vistas públicas: Portal Ciudadano ---
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <PortalPage /> },
          { path: 'consulta', element: <ConsultaPage /> },
          { path: 'login', element: <LoginPage /> },
        ],
      },

      // --- Vistas privadas: Panel interno de funcionarios ---
      {
        element: <RequireAuth allowedRoles={PANEL_ROLES} />,
        children: [
          {
            path: 'panel',
            element: <PrivateLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'requerimientos', element: <RequerimientosPage /> },
              {
                // Submódulos solo para roles con alcance global.
                element: <RequireAuth allowedRoles={GESTION_ROLES} />,
                children: [
                  { path: 'usuarios', element: <UsuariosPage /> },
                  { path: 'auditoria', element: <AuditoriaPage /> },
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
