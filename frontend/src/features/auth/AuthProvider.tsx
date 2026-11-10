import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  clearToken,
  getCurrentUser,
  isAuthenticated as hasValidSession,
  setToken,
  type JwtPayload,
} from '../../lib/auth'
import { UNAUTHORIZED_EVENT } from '../../services/api'
import { AuthContext, type AuthContextValue } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<JwtPayload | null>(() =>
    hasValidSession() ? getCurrentUser() : null,
  )

  const login = useCallback((token: string) => {
    setToken(token)
    setUser(getCurrentUser())
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  // El interceptor de Axios emite este evento ante un 401.
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
      navigate('/login', {
        replace: true,
        state: { reason: 'session-expired' },
      })
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
