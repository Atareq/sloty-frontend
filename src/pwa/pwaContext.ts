import { createContext, useContext } from 'react'
import type { PwaInstallState } from './pwaInstall'

export interface PwaContextValue extends PwaInstallState {
  applyUpdate: () => Promise<void>
  postponeUpdate: () => void
  updateAvailable: boolean
}

const defaultPwaContext: PwaContextValue = {
  applyUpdate: async () => undefined,
  dismissInstall: () => undefined,
  installKind: null,
  isInstalled: false,
  postponeUpdate: () => undefined,
  promptInstall: async () => null,
  updateAvailable: false,
}

export const PwaContext = createContext<PwaContextValue>(defaultPwaContext)

/** Reads app-level install and update state without coupling feature pages. */
export function usePwa(): PwaContextValue {
  return useContext(PwaContext)
}
