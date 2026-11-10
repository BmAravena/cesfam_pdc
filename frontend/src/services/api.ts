import axios, { AxiosError, type AxiosInstance } from 'axios'

import { clearToken, getToken } from '../lib/auth'

/** Evento global que escucha AuthContext cuando la sesión deja de ser válida. */
export const UNAUTHORIZED_EVENT = 'oirs:unauthorized'

const LOGIN_PATH = '/auth/login'

/**
 * Error normalizado para que las vistas no dependan de la forma exacta
 * en que Axios o FastAPI entregan los errores.
 */
export interface ValidationIssue {
  loc: Array<string | number>
  msg: string
  type: string
}

interface FastApiErrorBody {
  detail?: string | ValidationIssue[]
}

export class ApiError extends Error {
  readonly status: number | null
  readonly issues: ValidationIssue[]

  constructor(message: string, status: number | null, issues: ValidationIssue[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

function parseErrorBody(data: unknown): { message: string; issues: ValidationIssue[] } {
  const body = data as FastApiErrorBody | undefined
  const detail = body?.detail

  if (typeof detail === 'string') {
    return { message: detail, issues: [] }
  }

  if (Array.isArray(detail)) {
    const issues = detail.filter(
      (issue): issue is ValidationIssue =>
        typeof issue === 'object' && issue !== null && 'msg' in issue,
    )
    const message =
      issues.map((issue) => issue.msg).join(' · ') ||
      'Los datos enviados no son válidos.'
    return { message, issues }
  }

  return { message: 'Ocurrió un error inesperado.', issues: [] }
}

function normalizeError(error: AxiosError<FastApiErrorBody>): ApiError {
  if (!error.response) {
    const message =
      error.code === 'ECONNABORTED'
        ? 'La solicitud tardó demasiado. Intenta nuevamente.'
        : 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'
    return new ApiError(message, null)
  }

  const { message, issues } = parseErrorBody(error.response.data)
  return new ApiError(message, error.response.status, issues)
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
  },
})

/**
 * Interceptor de solicitud: inyecta el JWT almacenado en localStorage.
 * Solo se agrega la cabecera si existe un token, de modo que los
 * endpoints públicos sigan funcionando sin autenticación.
 */
api.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

/**
 * Interceptor de respuesta: normaliza errores y gestiona la sesión expirada.
 * En un 401 (fuera del login) se limpia el token y se notifica a la app
 * mediante un evento para que el router redirija a /login sin recargar.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<FastApiErrorBody>) => {
    const status = error.response?.status
    const isLoginRequest = error.config?.url?.includes(LOGIN_PATH) ?? false

    if (status === 401 && !isLoginRequest) {
      clearToken()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }

    return Promise.reject(normalizeError(error))
  },
)

/** Mensaje legible para cualquier error capturado en componentes. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}

export default api
