import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppViewModeContext } from '../../../layout/AppShell/AppShell.viewMode'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listClubs } from '../../clubs/clubsApi'
import { listPlatformUsers } from '../adminUsersApi'
import type { PlatformUser } from '../adminUsers.types'
import { AdminUsersPage } from './AdminUsersPage'

vi.mock('../adminUsersApi', () => ({
  listPlatformUsers: vi.fn(),
}))

vi.mock('../../clubs/clubsApi', () => ({
  listClubs: vi.fn(),
}))

const mockedListPlatformUsers = vi.mocked(listPlatformUsers)
const mockedListClubs = vi.mocked(listClubs)

const userAdmin: PlatformUser = {
  id: 21,
  username: 'admin-user',
  first_name: 'منى',
  last_name: 'عضو',
  email: 'mona@example.com',
  phone_number: '+201012345678',
  is_active: true,
  profile_role: 'ADMIN',
}

const userOwner: PlatformUser = {
  id: 22,
  username: 'owner-user',
  first_name: 'أحمد',
  last_name: 'مالك',
  email: 'ahmed@example.com',
  phone_number: '+201098765432',
  is_active: true,
  profile_role: 'OWNER',
}

function LocationProbe() {
  const location = useLocation()

  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  )
}

function renderPage(
  initialEntry = '/admin/users',
  viewMode: 'mobile' | 'desktop' = 'desktop',
) {
  return render(
    <AppViewModeContext.Provider value={viewMode}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={
              <>
                <AdminUsersPage />
                <LocationProbe />
              </>
            }
            path="/admin/users"
          />
          <Route element={<p>إضافة مستخدم</p>} path="/admin/users/new" />
          <Route element={<p>تفاصيل مستخدم</p>} path="/admin/users/:userId" />
        </Routes>
      </MemoryRouter>
    </AppViewModeContext.Provider>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListPlatformUsers.mockResolvedValue([userAdmin, userOwner])
    mockedListClubs.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
      ],
    })
  })

  it('renders users with display name, role label, and status', async () => {
    renderPage()

    expect(await screen.findByText('منى عضو')).toBeInTheDocument()
    expect(screen.getByText('@admin-user')).toBeInTheDocument()
    expect(screen.getByText('مسؤول منصة')).toBeInTheDocument()

    expect(screen.getByText('أحمد مالك')).toBeInTheDocument()
    expect(screen.getByText('@owner-user')).toBeInTheDocument()
    expect(screen.getByText('مالك')).toBeInTheDocument()
  })

  it('sends supported URL filters to the server-backed users endpoint', async () => {
    renderPage(
      '/admin/users?search=ahmed&club=3&role=STAFF&is_active=false',
    )

    await waitFor(() =>
      expect(mockedListPlatformUsers).toHaveBeenCalledWith({
        search: 'ahmed',
        club: '3',
        role: 'STAFF',
        is_active: 'false',
      }),
    )
  })

  it('submits filters through URL query without local-only filtering', async () => {
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('منى عضو')
    await chooseAppSelectOption(user, screen.getByLabelText('الدور'), 'موظف')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/users?role=STAFF',
    )
  })

  it('preserves filter query state when switching responsive presentation', async () => {
    const initialEntry = '/admin/users?search=ahmed&role=OWNER'
    const { rerender } = renderPage(initialEntry, 'desktop')

    await screen.findByText('منى عضو')

    rerender(
      <AppViewModeContext.Provider value="mobile">
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              element={
                <>
                  <AdminUsersPage />
                  <LocationProbe />
                </>
              }
              path="/admin/users"
            />
          </Routes>
        </MemoryRouter>
      </AppViewModeContext.Provider>,
    )

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/users?search=ahmed&role=OWNER',
    )
  })

  it('renders empty state when no users are returned', async () => {
    mockedListPlatformUsers.mockResolvedValueOnce([])

    renderPage()

    expect(
      await screen.findByText('لا يوجد مستخدمون حتى الآن.'),
    ).toBeInTheDocument()
  })
})
