import { Navigate, createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage/DashboardPage'
import { SchedulePage } from '../features/schedule/SchedulePage/SchedulePage'
import { AdminClubsPage } from '../features/admin/AdminClubsPage/AdminClubsPage'
import { RoleRoute } from '../core/auth/RoleRoute'
import { AppShell } from '../layout/AppShell/AppShell'

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
          <RoleRoute allowedRoles={['club_owner']}>
            <DashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: '/schedule',
        element: (
          <RoleRoute allowedRoles={['club_manager', 'court_staff']}>
            <SchedulePage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs',
        element: (
          <RoleRoute allowedRoles={['platform_super_admin']}>
            <AdminClubsPage />
          </RoleRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
])
