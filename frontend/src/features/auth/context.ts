import { createContext } from 'react'

import type { JwtPayload } from '../../lib/auth'

export interface AuthContextValue {
  user: JwtPayload | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
