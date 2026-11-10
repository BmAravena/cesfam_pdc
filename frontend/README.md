# Frontend OIRS · Salud Padre Las Casas

Aplicación React + TypeScript + Vite para el sistema OIRS del CESFAM Padre
Las Casas. Incluye portal ciudadano (público) y panel interno de funcionarios
(protegido con JWT).

## Requisitos

- Node.js 20+
- Backend FastAPI disponible en `http://localhost:8000`

## Puesta en marcha

```bash
npm install
copy .env.example .env      # Windows (PowerShell: Copy-Item .env.example .env)
npm run dev
```

La app queda en `http://localhost:5173`. Las peticiones a `/api/*` se
redirigen al backend mediante el proxy de Vite (`vite.config.ts`), evitando
problemas de CORS en desarrollo.

## Scripts

| Script              | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con HMR               |
| `npm run build`     | Verificación de tipos + build de producción   |
| `npm run typecheck` | Solo verificación de TypeScript               |
| `npm run lint`      | Lint con Oxlint                              |
| `npm run preview`   | Sirve el build de producción                  |

## Estructura

```text
src/
├── components/
│   └── RequireAuth.tsx       # Guard de rutas privadas + roles
├── features/auth/
│   ├── AuthProvider.tsx      # Estado de sesión y reacción a 401
│   ├── context.ts            # Contexto de autenticación
│   ├── LoginPage.tsx         # Formulario de acceso funcionarios
│   └── useAuth.ts            # Hook de consumo
├── layouts/
│   ├── RootLayout.tsx        # Provee AuthProvider
│   ├── PublicLayout.tsx      # Portal ciudadano
│   └── PrivateLayout.tsx     # Panel interno
├── lib/
│   ├── auth.ts               # Token en localStorage + decodificación JWT
│   └── roles.ts              # Roles del backend
├── pages/
│   ├── public/               # Portal y consulta pública
│   ├── private/              # Panel, requerimientos, usuarios, auditoría
│   └── NotFoundPage.tsx
├── router/index.tsx          # Rutas públicas y privadas
├── services/
│   ├── api.ts                # Axios + interceptores JWT/401
│   └── auth.ts               # POST /auth/login
├── index.css                 # Tailwind CSS v4 (tema en @theme)
└── main.tsx
```

## Autenticación

1. `POST /api/v1/auth/login` recibe `username` y `password` como
   `application/x-www-form-urlencoded` y devuelve `{ access_token, token_type }`.
2. El token se guarda en `localStorage` con la clave `oirs.access_token`.
3. El interceptor de solicitud agrega `Authorization: Bearer <token>`.
4. Ante un `401` (fuera del login), el interceptor limpia el token y emite el
   evento `oirs:unauthorized`; `AuthProvider` redirige a `/login`.
5. Las rutas privadas viven bajo `/panel` y validan rol con `RequireAuth`.

## Pendientes de integración

- Endpoint público de seguimiento para `/consulta`.
- Listados reales de requerimientos, usuarios y auditoría.
- Encuesta de satisfacción.
- Configuración de CORS en FastAPI para despliegues sin proxy.
