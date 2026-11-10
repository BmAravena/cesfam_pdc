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
  username: string,
  password: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({ username, password })

  const { data } = await api.post<TokenResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return data
}
