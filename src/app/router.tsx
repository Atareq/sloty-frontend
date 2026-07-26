import { Navigate, createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { ClubSelectionPage } from '../features/auth/ClubSelectionPage/ClubSelectionPage'
import { NoClubAccessPage } from '../features/auth/NoClubAccessPage/NoClubAccessPage'
import { AuditLogsPage } from '../features/audit/AuditLogsPage/AuditLogsPage'
import { BookingsListPage } from '../features/bookings/BookingsListPage/BookingsListPage'
import { DashboardPage } from '../features/dashboard/DashboardPage/DashboardPage'
import { SchedulePage } from '../features/schedule/SchedulePage/SchedulePage'
import { ClubFormPage } from '../features/clubs/ClubFormPage/ClubFormPage'
import { ClubsListPage } from '../features/clubs/ClubsListPage/ClubsListPage'
import { CourtFormPage } from '../features/courts/CourtFormPage/CourtFormPage'
import { CourtsListPage } from '../features/courts/CourtsListPage/CourtsListPage'
import { SettingsCourtDetailsPage } from '../features/courts/SettingsCourtDetailsPage/SettingsCourtDetailsPage'
import { SettingsCourtsPage } from '../features/courts/SettingsCourtsPage/SettingsCourtsPage'
import { PlaceholderPage } from '../features/placeholders/PlaceholderPage/PlaceholderPage'
import { ReportsPage } from '../features/reports/ReportsPage/ReportsPage'
import { SettlementDetailPage } from '../features/settlements/SettlementDetailPage/SettlementDetailPage'
import { SettlementHistoryPage } from '../features/settlements/SettlementHistoryPage/SettlementHistoryPage'
import { SettlementsHubPage } from '../features/settlements/SettlementsHubPage/SettlementsHubPage'
import { SettlementPreviewPage } from '../features/settlements/SettlementPreviewPage/SettlementPreviewPage'
import { SettingsHubPage } from '../features/settings/SettingsHubPage/SettingsHubPage'
import { SettingsUsersPage } from '../features/settings/SettingsUsersPage/SettingsUsersPage'
import { TransactionsListPage } from '../features/transactions/TransactionsListPage/TransactionsListPage'
import { AuthLandingRedirect } from '../core/auth/AuthLandingRedirect'
import { ProtectedRoute } from '../core/auth/ProtectedRoute'
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
    path: '/',
    element: <AuthLandingRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/select-club',
    element: (
      <ProtectedRoute>
        <ClubSelectionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/no-club-access',
    element: (
      <ProtectedRoute>
        <NoClubAccessPage />
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute enforceClubAccess>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER', 'STAFF']}>
            <DashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: '/schedule',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER', 'STAFF']}>
            <SchedulePage />
          </RoleRoute>
        ),
      },
      {
        path: '/bookings',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER', 'STAFF']}>
            <BookingsListPage />
          </RoleRoute>
        ),
      },
      {
        path: '/transactions',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER', 'STAFF']}>
            <TransactionsListPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settlements',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettlementsHubPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settlements/history',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettlementHistoryPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settlements/preview',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettlementPreviewPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settlements/:settlementId',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettlementDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: '/reports',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <ReportsPage />
          </RoleRoute>
        ),
      },
      {
        path: '/audit-logs',
        element: (
          <RoleRoute allowedRoles={['OWNER']}>
            <AuditLogsPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settings/courts',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettingsCourtsPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settings/courts/:courtId',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettingsCourtDetailsPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettingsHubPage />
          </RoleRoute>
        ),
      },
      {
        path: '/settings/users',
        element: (
          <RoleRoute allowedRoles={['OWNER']}>
            <SettingsUsersPage />
          </RoleRoute>
        ),
      },
      {
        path: '/more',
        element: (
          <RoleRoute allowedRoles={['MANAGER', 'STAFF']}>
            <PlaceholderPage
              description="مسار مؤقت للمزيد من إجراءات الموظف والمدير."
              title="المزيد"
            />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <ClubsListPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs/new',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <ClubFormPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs/:clubId',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <ClubFormPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs/:clubSlug/courts',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <CourtsListPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs/:clubSlug/courts/new',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <CourtFormPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/clubs/:clubSlug/courts/:courtId',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <CourtFormPage />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <PlaceholderPage
              description="مسار مؤقت لإدارة مستخدمي المنصة."
              title="المستخدمون"
            />
          </RoleRoute>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
            <PlaceholderPage
              description="مسار مؤقت لإعدادات منصة سلوتي."
              title="إعدادات المنصة"
            />
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
