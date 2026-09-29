import { Navigate, createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { ClubSelectionPage } from '../features/auth/ClubSelectionPage/ClubSelectionPage'
import { NoClubAccessPage } from '../features/auth/NoClubAccessPage/NoClubAccessPage'
import { NoOperationalAccessPage } from '../features/auth/NoOperationalAccessPage/NoOperationalAccessPage'
import { AuditLogsPage } from '../features/audit/AuditLogsPage/AuditLogsPage'
import { AdminUserDetailsPage } from '../features/adminUsers/AdminUserDetailsPage/AdminUserDetailsPage'
import { AdminUserFormPage } from '../features/adminUsers/AdminUserFormPage/AdminUserFormPage'
import { AdminUsersPage } from '../features/adminUsers/AdminUsersPage/AdminUsersPage'
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
import { SettlementDetailPage } from '../features/settlements/SettlementDetailPage/SettlementDetailPage'
import { SettlementHistoryPage } from '../features/settlements/SettlementHistoryPage/SettlementHistoryPage'
import { SettlementsHubPage } from '../features/settlements/SettlementsHubPage/SettlementsHubPage'
import { SettlementPreviewPage } from '../features/settlements/SettlementPreviewPage/SettlementPreviewPage'
import { SettingsHubPage } from '../features/settings/SettingsHubPage/SettingsHubPage'
import { SettingsUsersPage } from '../features/settings/SettingsUsersPage/SettingsUsersPage'
import { TransactionsListPage } from '../features/transactions/TransactionsListPage/TransactionsListPage'
import { ProtectedRoute } from '../core/auth/ProtectedRoute'
import { RoleRoute } from '../core/auth/RoleRoute'
import { AppShell } from '../layout/AppShell/AppShell'
import { PublicSchedulePage } from '../features/publicSchedule/PublicSchedulePage/PublicSchedulePage'
import { publicScheduleSeo } from '../features/publicSchedule/publicSchedule.seo'
import { AssiutPage } from '../features/publicSite/AssiutPage/AssiutPage'
import {
  assiutPageSeo,
  homePageSeo,
} from '../features/publicSite/publicSite.seo'
import { SeoRouteBoundary } from '../core/seo/SeoRouteBoundary'
import { routeSeo } from '../core/seo/seoRoute'
import { HomeRoute } from './HomeRoute'

/**
 * Sloty application route map.
 *
 * These routes compose real authenticated screens. Backend permissions remain
 * authoritative; RoleRoute is frontend UX only.
 *
 * `SeoRouteBoundary` is the single root layout that owns document SEO. Only
 * routes with `handle: routeSeo(...)` declare their own metadata; every other
 * route inherits the private `noindex` default.
 */
export const router = createBrowserRouter([
  {
    element: <SeoRouteBoundary />,
    children: [
      {
        path: '/',
        element: <HomeRoute />,
        handle: routeSeo(homePageSeo),
      },
      {
        path: '/assiut',
        element: <AssiutPage />,
        handle: routeSeo(assiutPageSeo),
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/public/:clubSlug/courts/:courtId/schedule',
        element: <PublicSchedulePage />,
        handle: routeSeo(publicScheduleSeo),
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
        path: '/no-operational-access',
        element: (
          <ProtectedRoute allowNonOperational>
            <NoOperationalAccessPage />
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
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <DashboardPage />
              </RoleRoute>
            ),
          },
          {
            path: '/schedule',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <SchedulePage />
              </RoleRoute>
            ),
          },
          {
            path: '/bookings',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <BookingsListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/transactions',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <TransactionsListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settlements',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <SettlementsHubPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settlements/history',
            element: (
              <RoleRoute allowedRoles={['OWNER']}>
                <SettlementHistoryPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settlements/preview',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <SettlementPreviewPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settlements/:settlementId',
            element: (
              <RoleRoute allowedRoles={['OWNER', 'STAFF']}>
                <SettlementDetailPage />
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
              <RoleRoute allowedRoles={['OWNER']}>
                <SettingsCourtsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settings/courts/:courtId',
            element: (
              <RoleRoute allowedRoles={['OWNER']}>
                <SettingsCourtDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/settings',
            element: (
              <RoleRoute allowedRoles={['OWNER']}>
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
            path: '/admin/clubs',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <ClubsListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/clubs/new',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <ClubFormPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/clubs/:clubId',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <ClubFormPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/clubs/:clubSlug/courts',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <CourtsListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/clubs/:clubSlug/courts/new',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <CourtFormPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/clubs/:clubSlug/courts/:courtId',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <CourtFormPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/users',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/users/new',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminUserFormPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/users/:userId',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminUserDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/admin/settings',
            element: (
              <RoleRoute allowedRoles={['ADMIN']}>
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
    ],
  },
])
