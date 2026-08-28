import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listAuditLogs } from '../auditApi'
import { AuditLogsPage } from './AuditLogsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../auditApi', () => ({
  listAuditLogs: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListAuditLogs = vi.mocked(listAuditLogs)
const mockedListClubUsers = vi.mocked(listClubUsers)

function LocationProbe() {
  const location = useLocation()

  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>
}

function renderAuditLogsPage(initialEntry = '/audit-logs') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuditLogsPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function mockAuth(
  role: 'OWNER' | 'STAFF' = 'OWNER',
  selectedClubSlug: string | null = 'nasr-club',
) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role,
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
        }
      : null,
    role,
    isAuthenticated: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    refreshCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  })
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListAuditLogs.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          action: 'TRANSACTION_CANCELLED',
          action_label: 'تم إلغاء دفعة',
          actor: { id: 7, name: 'Owner Mahmoud' },
          target_type: 'Transaction',
          target_id: 101,
          message: 'تم إلغاء الدفع',
          metadata: {
            reason: 'Wrong amount entered',
          },
        },
      ],
    })
    mockedListClubUsers.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 7,
          membership_id: 70,
          username: 'owner-user',
          first_name: 'محمود',
          last_name: 'حسن',
          phone_number: '01000000000',
          role: 'OWNER',
        },
        {
          id: 8,
          membership_id: 80,
          username: 'staff-user',
          first_name: '',
          last_name: '',
          phone_number: '01111111111',
          role: 'STAFF',
        },
      ],
    })
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    renderAuditLogsPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض سجل النشاط'),
    ).toBeInTheDocument()
    expect(mockedListAuditLogs).not.toHaveBeenCalled()
  })

  it('blocks staff users', async () => {
    mockAuth('STAFF')

    renderAuditLogsPage()

    expect(
      await screen.findByText('ليس لديك صلاحية عرض سجل النشاط'),
    ).toBeInTheDocument()
    expect(mockedListAuditLogs).not.toHaveBeenCalled()
  })

  it('renders audit log cards with clean metadata', async () => {
    renderAuditLogsPage()

    expect(await screen.findAllByText('تم إلغاء دفعة')).toHaveLength(2)
    expect(screen.queryByText('TRANSACTION_CANCELLED')).not.toBeInTheDocument()
    expect(screen.getByText('تم إلغاء الدفع')).toBeInTheDocument()
    expect(screen.getByText('Owner Mahmoud')).toBeInTheDocument()
    expect(screen.getByText('السبب')).toBeInTheDocument()
    expect(screen.getByText('Wrong amount entered')).toBeInTheDocument()
    expect(mockedListAuditLogs).toHaveBeenCalledWith('nasr-club', {})
  })

  it('uses named audit filter labels and hides manual ID wording', async () => {
    renderAuditLogsPage()

    expect(await screen.findByLabelText('المستخدم')).toBeInTheDocument()
    expect(screen.getByLabelText('نوع الإجراء')).toBeInTheDocument()
    expect(screen.queryByText('رقم المستخدم')).not.toBeInTheDocument()
    expect(screen.queryByText('الإجراء')).not.toBeInTheDocument()
  })

  it('loads club users into the user filter with backend ids as option values', async () => {
    const user = userEvent.setup()

    renderAuditLogsPage()

    const userSelect = await screen.findByLabelText('المستخدم')

    await user.click(userSelect)

    expect(await screen.findByRole('option', { name: 'كل المستخدمين' }))
      .toHaveValue('')
    expect(screen.getByRole('option', { name: 'محمود حسن' }))
      .toHaveValue('7')
    expect(screen.getByRole('option', { name: 'staff-user' }))
      .toHaveValue('8')
    expect(userSelect).toBeEnabled()
    expect(mockedListClubUsers).toHaveBeenCalledWith('nasr-club', {
      is_active: true,
    })
  })

  it('preserves deep-linked unknown user ids with a fallback option', async () => {
    const user = userEvent.setup()

    renderAuditLogsPage('/audit-logs?actor=15')

    const userSelect = await screen.findByLabelText('المستخدم')
    await user.click(userSelect)

    expect(await screen.findByRole('option', { name: 'مستخدم #15' }))
      .toHaveValue('15')
    expect(screen.getByLabelText('المستخدم')).toHaveValue('15')
    expect(mockedListAuditLogs).toHaveBeenCalledWith('nasr-club', {
      actor: '15',
    })
  })

  it('uses Arabic audit action labels while keeping enum values internally', async () => {
    const user = userEvent.setup()

    renderAuditLogsPage()

    const actionSelect = await screen.findByLabelText('نوع الإجراء')

    await user.click(actionSelect)

    expect(await screen.findByRole('option', { name: 'كل الإجراءات' }))
      .toHaveValue('')
    expect(screen.getByRole('option', { name: 'إلغاء معاملة مالية' }))
      .toHaveValue('TRANSACTION_CANCELLED')
    expect(screen.getByRole('option', { name: 'تعليم التسوية كمكتملة' }))
      .toHaveValue('SETTLEMENT_MARKED_SETTLED')
    expect(screen.queryByText('TRANSACTION_CANCELLED')).not.toBeInTheDocument()

    await user.click(actionSelect)
    await chooseAppSelectOption(user, actionSelect, 'إلغاء معاملة مالية')
    await user.click(screen.getByRole('button', { name: 'تحديث السجل' }))

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/audit-logs?action=TRANSACTION_CANCELLED',
    )
    expect(mockedListAuditLogs).toHaveBeenLastCalledWith('nasr-club', {
      action: 'TRANSACTION_CANCELLED',
    })
  })

  it('preserves unknown deep-linked action values', async () => {
    const user = userEvent.setup()

    renderAuditLogsPage('/audit-logs?action=NEW_BACKEND_ACTION')

    const actionSelect = await screen.findByLabelText('نوع الإجراء')
    expect(actionSelect).toHaveValue('NEW_BACKEND_ACTION')

    await user.click(actionSelect)

    expect(await screen.findByRole('option', { name: 'New Backend Action' }))
      .toHaveValue('NEW_BACKEND_ACTION')
    expect(mockedListAuditLogs).toHaveBeenCalledWith('nasr-club', {
      action: 'NEW_BACKEND_ACTION',
    })
  })

  it('shows filter option errors without blocking audit logs', async () => {
    mockedListClubUsers.mockRejectedValueOnce(new Error('failed'))

    renderAuditLogsPage()

    expect(await screen.findByText('تعذر تحميل خيارات الفلاتر'))
      .toBeInTheDocument()
    expect(await screen.findAllByText('تم إلغاء دفعة')).toHaveLength(2)
    expect(mockedListAuditLogs).toHaveBeenCalledWith('nasr-club', {})
  })
})
