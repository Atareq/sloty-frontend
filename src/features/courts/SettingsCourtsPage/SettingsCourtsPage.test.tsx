import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRole } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import type { PaginatedResponse } from '../../../shared/api/api.types'
import { listCourts } from '../courtsApi'
import { SettingsCourtsPage } from './SettingsCourtsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListCourts = vi.mocked(listCourts)

function paginatedResponse<T>(results: T[]): PaginatedResponse<T> {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

function mockMembership(role: AuthRole = 'OWNER') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    accessibleClubs: [],
    accessibleCourts: [],
    selectedCourtId: null,
    selectCourt: vi.fn(),
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

describe('SettingsCourtsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMembership('OWNER')
  })

  it('loads courts for an owner selected club', async () => {
    mockedListCourts.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 7,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ]),
    )

    render(
      <MemoryRouter>
        <SettingsCourtsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('ملعب 1')).toBeInTheDocument()
    expect(mockedListCourts).toHaveBeenCalledWith('nasr-club')
  })

  it('shows no-permission for staff without working-hours or pricing permission', async () => {
    mockMembership('STAFF')

    render(
      <MemoryRouter>
        <SettingsCourtsPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('ليس لديك صلاحية تعديل مواعيد العمل.'),
    ).toBeInTheDocument()
    expect(mockedListCourts).not.toHaveBeenCalled()
  })
})
