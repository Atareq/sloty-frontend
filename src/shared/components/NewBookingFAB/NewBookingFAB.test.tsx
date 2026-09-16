import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OfflineSyncContext } from '../../../offline/sync/offlineSyncContext'
import { NewBookingFAB } from './NewBookingFAB'

describe('NewBookingFAB', () => {
  it('renders the Arabic new booking label', () => {
    render(<NewBookingFAB />)

    expect(screen.getByRole('button', { name: 'حجز جديد' })).toBeInTheDocument()
  })

  it('disables the button with offline title when offline', () => {
    const offlineSyncValue = {
      connectivity: {
        browserNetwork: 'offline' as const,
        backendReachability: 'unreachable' as const,
        lastConnectivityChangeAt: null,
        lastBrowserEvent: null,
        eventVersion: 0,
      },
      freshness: {
        ageMs: 0,
        canCreateNewOfflineRequest: false,
        isLoading: false,
        lastSuccessfulOperationalSyncAt: null,
        level: 'stale_warning' as const,
        warningText: null,
      },
      requestSync: vi.fn(),
      sync: {
        status: 'idle' as const,
        activeScopeKey: null,
        activeDataset: null,
        lastRunStartedAt: null,
        lastRunCompletedAt: null,
        lastRunResult: null,
        backendReachability: 'unreachable' as const,
      },
    }

    render(
      <OfflineSyncContext.Provider value={offlineSyncValue}>
        <NewBookingFAB />
      </OfflineSyncContext.Provider>,
    )

    const button = screen.getByRole('button', { name: 'حجز جديد' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'يحتاج اتصال بالإنترنت')
  })
})
