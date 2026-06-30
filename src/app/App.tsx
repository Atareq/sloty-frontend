import { RouterProvider } from 'react-router'
import { AuthProvider } from '../core/auth/AuthProvider'
import { router } from './router'

/**
 * Root application component.
 *
 * Keeping the router here makes tests and future app-level providers easier to
 * attach without leaking routing details into `main.tsx`.
 */
export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
