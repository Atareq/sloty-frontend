import { useSyncExternalStore } from 'react'
import {
  clearAccessToken,
  getAccessToken,
  isAuthenticated,
  setAccessToken,
} from './authStorage'

const AUTH_EVENT_NAME = 'sloty-placeholder-auth-change'

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_EVENT_NAME))
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(AUTH_EVENT_NAME, onStoreChange)
  window.addEventListener('storage', onStoreChange)

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

/**
 * React hook for the current placeholder auth state.
 *
 * This wraps the sessionStorage helper so route guards and screens can react to
 * local login/logout changes before real backend authentication is introduced.
 */
export function usePlaceholderAuth() {
  const accessToken = useSyncExternalStore(subscribe, getAccessToken, () => null)

  return {
    accessToken,
    isAuthenticated: isAuthenticated(),
    login(token: string): void {
      setAccessToken(token)
      notifyAuthChange()
    },
    logout(): void {
      clearAccessToken()
      notifyAuthChange()
    },
  }
}
