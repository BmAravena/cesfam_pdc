import api from './api'

export interface TokenResponse {
  access_token: string
  token_type: string
}

/**
 * El backend usa OAuth2PasswordRequestForm, por lo que las credenciales
 * deben enviarse como application/x-www-form-urlencoded (no JSON).
 */
export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  // OAuth2PasswordRequestForm exige el campo "username"; el backend lo
  // interpreta como el email del usuario.
  const body = new URLSearchParams({ username: email, password })

  const { data } = await api.post<TokenResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return data
}
