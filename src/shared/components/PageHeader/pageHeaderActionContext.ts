import { createContext, type ReactNode } from 'react'

export type PageHeaderActionSetter = (action: ReactNode) => void

export const PageHeaderActionContext =
  createContext<PageHeaderActionSetter | null>(null)
