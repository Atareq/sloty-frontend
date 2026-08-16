import { createContext, useContext } from 'react'

export type ViewMode = 'mobile' | 'desktop'

export const AppViewModeContext = createContext<ViewMode>('mobile')

export function useAppViewMode(): ViewMode {
  return useContext(AppViewModeContext)
}
