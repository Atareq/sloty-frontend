import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import {
  createClubStaff,
  listClubUsers,
  updateClubUser,
} from '../../clubUsers/clubUsersApi'
import type { ClubUser } from '../../clubUsers/clubUsers.types'
import { SettingsUsersPage } from './SettingsUsersPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  createClubStaff: vi.fn(),
  listClubUsers: vi.fn(),
  updateClubUser: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreateClubStaff = vi.mocked(createClubStaff)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedUpdateClubUser = vi.mocked(updateClubUser)

const staffMember1: ClubUser = {
  id: 10,
  username: 'staff-ahmed',
  first_name: 'أحمد',
  last_name: 'علي',
  email: 'ahmed@example.com',
  phone_number: '+201012345678',
  is_active: true,
  role: 'STAFF',
}

const staffMember2: ClubUser = {
  id: 11,
  username: 'staff-sara',
  first_name: 'سارة',
  last_name: 'محمود',
  email: 'sara@example.com',
  phone_number: '+201098765432',
  is_active: false,
  role: 'STAFF',
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

function mockAuth(options: {
  role?: 'OWNER' | 'STAFF' | 'ADMIN'
  selectedClubSlug?: string | null
} = {}) {
  const role = options.role ?? 'OWNER'
  const selectedClubSlug =
    'selectedClubSlug' in options ? options.selectedClubSlug ?? null : 'nasr-club'
  const refreshCurrentUser = vi.fn().mockResolvedValue(undefined)

  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role },
    currentUser: {
      id: 1,
      username: 'owner-user',
      email: 'owner@example.com',
      first_name: 'أحمد',
      last_name: 'مالك',
      phone_number: '+201000000001',
      is_active: true,
      profile_role: role,
      account_created_by: null,
    },
    selectedClubSlug,
    accessibleClubs: [],
    selectedCourtId: null,
    accessibleCourts: [],
    role,
    isAuthenticated: true,
    isOperational: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    selectCourt: vi.fn(),
    refreshCurrentUser,
    setTokens: vi.fn(),
  })

  return { refreshCurrentUser }
}

function renderUsersPage(initialEntry = '/settings/users') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/settings/users"
          element={
            <>
              <SettingsUsersPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/settings/users')
    mockAuth()
    mockedListClubUsers.mockResolvedValue([staffMember1, staffMember2])
  })

  afterEach(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  it('denies non-owner users with an Arabic message', async () => {
    mockAuth({ role: 'STAFF' })

    renderUsersPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة موظفي النادي'),
    ).toBeInTheDocument()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('shows no selected club message', async () => {
    mockAuth({ selectedClubSlug: null })

    renderUsersPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض الموظفين'),
    ).toBeInTheDocument()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('loads and renders staff users for the selected club', async () => {
    renderUsersPage()

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('@staff-ahmed')).toBeInTheDocument()
    expect(screen.getByText('سارة محمود')).toBeInTheDocument()
    expect(screen.getByText('@staff-sara')).toBeInTheDocument()
    expect(mockedListClubUsers).toHaveBeenCalledWith('nasr-club', {
      role: 'STAFF',
    })
  })

  it('allows owner to toggle staff active status', async () => {
    const user = userEvent.setup()
    mockedUpdateClubUser.mockResolvedValueOnce({
      ...staffMember1,
      is_active: false,
    })

    renderUsersPage()

    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    const deactivateButton = screen.getByRole('button', { name: 'إيقاف الموظف' })
    await user.click(deactivateButton)

    await waitFor(() => {
      expect(mockedUpdateClubUser).toHaveBeenCalledWith(10, { is_active: false })
    })
    expect(await screen.findByText('✓ تم إيقاف الموظف')).toBeInTheDocument()
  })

  it('allows owner to activate an inactive staff member', async () => {
    const user = userEvent.setup()
    mockedUpdateClubUser.mockResolvedValueOnce({
      ...staffMember2,
      is_active: true,
    })

    renderUsersPage()

    expect(await screen.findByText('سارة محمود')).toBeInTheDocument()
    const activateButton = screen.getByRole('button', { name: 'تفعيل الموظف' })
    await user.click(activateButton)

    await waitFor(() => {
      expect(mockedUpdateClubUser).toHaveBeenCalledWith(11, { is_active: true })
    })
    expect(await screen.findByText('✓ تم تفعيل الموظف')).toBeInTheDocument()
  })

  it('creates new club staff member', async () => {
    const user = userEvent.setup()
    mockedCreateClubStaff.mockResolvedValueOnce({
      id: 12,
      username: 'new-staff',
      first_name: 'علي',
      last_name: 'حسن',
      phone_number: '+201011223344',
      email: 'ali@example.com',
      is_active: true,
      role: 'STAFF',
    })

    renderUsersPage()

    await screen.findByText('أحمد علي')
    await user.click(screen.getByRole('button', { name: 'إضافة موظف' }))

    expect(screen.getAllByRole('heading', { name: 'إضافة موظف جديد' }).length).toBeGreaterThan(0)

    await user.type(screen.getByPlaceholderText('الاسم الأول'), 'علي')
    await user.type(screen.getByPlaceholderText('اسم العائلة'), 'حسن')
    await user.type(screen.getByPlaceholderText('اسم المستخدم للدخول'), 'new-staff')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Password123!')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Password123!')

    await user.click(screen.getByRole('button', { name: 'إضافة الموظف' }))

    await waitFor(() => {
      expect(mockedCreateClubStaff).toHaveBeenCalledWith('nasr-club', {
        first_name: 'علي',
        last_name: 'حسن',
        username: 'new-staff',
        phone_number: undefined,
        email: undefined,
        password: 'Password123!',
        is_active: true,
      })
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إضافة موظف جديد' }),
      ).not.toBeInTheDocument()
    })
  })

  it('validates required fields before submitting create staff', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    await screen.findByText('أحمد علي')
    await user.click(screen.getByRole('button', { name: 'إضافة موظف' }))
    await user.click(screen.getByRole('button', { name: 'إضافة الموظف' }))

    expect(await screen.findByText('الاسم الأول مطلوب')).toBeInTheDocument()
    expect(screen.getByText('اسم المستخدم مطلوب')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور مطلوبة')).toBeInTheDocument()
    expect(mockedCreateClubStaff).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إضافة موظف جديد' }),
      ).not.toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    await screen.findByText('أحمد علي')
    await user.click(screen.getByRole('button', { name: 'إضافة موظف' }))

    await user.type(screen.getByPlaceholderText('الاسم الأول'), 'علي')
    await user.type(screen.getByPlaceholderText('اسم المستخدم للدخول'), 'new-staff')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Pass1')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Pass2')

    await user.click(screen.getByRole('button', { name: 'إضافة الموظف' }))

    expect(await screen.findByText('تأكيد كلمة المرور غير مطابق')).toBeInTheDocument()
    expect(mockedCreateClubStaff).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إضافة موظف جديد' }),
      ).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('عندك تعديلات لسه متحفظتش.')).not.toBeInTheDocument()
    })
  })

  it('validates optional staff phone numbers with the shared message', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    await screen.findByText('أحمد علي')
    await user.click(screen.getByRole('button', { name: 'إضافة موظف' }))

    await user.type(screen.getByPlaceholderText('الاسم الأول'), 'علي')
    await user.type(screen.getByPlaceholderText('اسم المستخدم للدخول'), 'new-staff')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Pass1')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Pass1')
    await user.type(screen.getByLabelText('رقم الموبايل'), '01012')

    await user.click(screen.getByRole('button', { name: 'إضافة الموظف' }))

    expect(await screen.findByText('رقم الموبايل غير صحيح')).toBeInTheDocument()
    expect(mockedCreateClubStaff).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إضافة موظف جديد' }),
      ).not.toBeInTheDocument()
    })
  })

  it('prompts for unsaved changes when closing add staff sheet with dirty inputs', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    await screen.findByText('أحمد علي')
    await user.click(screen.getByRole('button', { name: 'إضافة موظف' }))

    const firstNameInput = (await screen.findByPlaceholderText('الاسم الأول')) as HTMLInputElement
    await user.type(firstNameInput, 'علي')
    const cancelButton = screen.getByRole('button', { name: 'إلغاء' })
    await user.click(cancelButton)

    expect(
      await screen.findByText('عندك تعديلات لسه متحفظتش.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إضافة موظف جديد' }),
      ).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('عندك تعديلات لسه متحفظتش.')).not.toBeInTheDocument()
    })
  })
})
