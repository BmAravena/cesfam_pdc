import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth'
import { getErrorMessage } from '../../services/api'
import { login as loginRequest } from '../../services/auth'

interface LoginLocationState {
  from?: string
  reason?: 'session-expired'
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()

  const state = (location.state as LoginLocationState | null) ?? {}
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={state.from ?? '/panel'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { access_token } = await loginRequest(email.trim(), password)
      login(access_token)
      navigate(state.from ?? '/panel', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
      <div className="hidden rounded-2xl bg-brand-950 p-8 text-white lg:block">
        <span className="grid size-11 place-items-center rounded-xl bg-white/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Panel interno OIRS
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-100">
          Espacio exclusivo para funcionarios del CESFAM Padre Las Casas.
          Gestiona requerimientos, encuestas y auditoría según tu rol y
          establecimiento.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-brand-100">
          <li>• Acceso protegido con JWT</li>
          <li>• Permisos por rol y sede</li>
          <li>• Registro de auditoría de acciones</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Iniciar sesión
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ingresa con tus credenciales institucionales.
        </p>

        {state.reason === 'session-expired' && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            Tu sesión expiró. Vuelve a iniciar sesión para continuar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="username"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="nombre@cesfam.cl"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-brand-700 hover:underline">
            Volver al portal ciudadano
          </Link>
        </p>
      </div>
    </section>
  )
}
