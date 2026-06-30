import { useContext } from 'react'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './auth.types'

/**
 * Reads frontend auth state from `AuthProvider`.
 *
 * Components should use this hook instead of decoding JWTs directly.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
