import { Navigate, createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { ClubSelectionPage } from '../features/auth/ClubSelectionPage/ClubSelectionPage'
import { NoClubAccessPage } from '../features/auth/NoClubAccessPage/NoClubAccessPage'
import { DashboardPage } from '../features/dashboard/DashboardPage/DashboardPage'
import { SchedulePage } from '../features/schedule/SchedulePage/SchedulePage'
import { ClubFormPage } from '../features/clubs/ClubFormPage/ClubFormPage'
import { ClubsListPage } from '../features/clubs/ClubsListPage/ClubsListPage'
import { CourtFormPage } from '../features/courts/CourtFormPage/CourtFormPage'
import { CourtsListPage } from '../features/courts/CourtsListPage/CourtsListPage'
import { PlaceholderPage } from '../features/placeholders/PlaceholderPage/PlaceholderPage'
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
          <RoleRoute
            allowedRoles={['OWNER', 'MANAGER', 'STAFF']}
          >
            <PlaceholderPage
              description="مسار مؤقت لقائمة الحجوزات داخل واجهة سلوتي التشغيلية."
              title="الحجوزات"
            />
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
          <RoleRoute allowedRoles={['OWNER']}>
            <PlaceholderPage
              description="مسار مؤقت لتسويات المالك بدون منطق مالي حقيقي."
              title="التسويات"
            />
          </RoleRoute>
        ),
      },
      {
        path: '/reports',
        element: (
          <RoleRoute allowedRoles={['OWNER']}>
            <PlaceholderPage
              description="مسار مؤقت للتقارير، وسيبقى بلا أرقام وهمية حتى اعتماد مصادر البيانات."
              title="التقارير"
            />
          </RoleRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <RoleRoute allowedRoles={['OWNER']}>
            <PlaceholderPage
              description="مسار مؤقت لإعدادات النادي ضمن صلاحيات المالك."
              title="الإعدادات"
            />
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
