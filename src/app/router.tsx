import { Navigate, createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage/DashboardPage'
import { AppShell } from '../layout/AppShell/AppShell'
import { ProtectedRoute } from '../layout/ProtectedRoute/ProtectedRoute'

/**
 * Sloty route map for the React restart foundation.
 *
 * These routes only wire screen placeholders. They do not define backend
 * permissions, API contracts, or real booking workflows.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <Navigate to="/login" replace />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
])
