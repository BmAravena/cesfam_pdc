/**
 * Utilidades de autenticación basadas en el JWT emitido por FastAPI.
 *
 * El token se guarda en localStorage bajo una única clave para que el
 * interceptor de Axios y el contexto de autenticación trabajen con la
 * misma fuente de verdad.
 */

const TOKEN_KEY = 'oirs.access_token'

export interface JwtPayload {
  sub: string
  id_usuario?: number
  id_rol?: number
  id_establecimiento?: number
  rol?: string
  exp?: number
  iat?: number
  [claim: string]: unknown
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )

  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Decodifica el payload del JWT sin validar la firma (eso lo hace el backend). */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(base64UrlDecode(payload)) as JwtPayload
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload?.exp) return false
  // Margen de 10 segundos para evitar usar un token que expira en tránsito.
  return payload.exp * 1000 <= Date.now() + 10_000
}

/** Devuelve true solo si existe un token y aún no expira. */
export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  if (isTokenExpired(token)) {
    clearToken()
    return false
  }
  return true
}

/** Datos del usuario contenidos en el JWT (rol, establecimiento, etc.). */
export function getCurrentUser(): JwtPayload | null {
  const token = getToken()
  if (!token || isTokenExpired(token)) return null
  return decodeToken(token)
}

/** Compara el rol del JWT sin distinguir mayúsculas/minúsculas. */
export function hasRole(
  user: JwtPayload | null,
  roles: readonly string[],
): boolean {
  if (!user?.rol) return false
  const current = user.rol.toLowerCase()
  return roles.some((role) => role.toLowerCase() === current)
}
