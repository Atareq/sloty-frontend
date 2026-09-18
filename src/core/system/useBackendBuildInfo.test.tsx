import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBackendBuildInfo } from './systemApi'
import { useBackendBuildInfo } from './useBackendBuildInfo'

vi.mock('./systemApi', () => ({
  fetchBackendBuildInfo: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchBackendBuildInfo)

function Probe({ enabled }: { enabled: boolean }) {
  const { backendBuildInfo, isLoaded } = useBackendBuildInfo(enabled)

  return (
    <p>
      {isLoaded ? 'loaded' : 'loading'}{' '}
      {backendBuildInfo?.release ?? 'none'}
    </p>
  )
}

describe('useBackendBuildInfo', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when the caller is not an admin session', () => {
    render(<Probe enabled={false} />)

    expect(screen.getByText('loaded none')).toBeInTheDocument()
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('loads backend metadata once for an enabled admin session', async () => {
    mockedFetch.mockResolvedValue({
      service: 'sloty-backend',
      release: 'v0.7.0',
      commit: '91bd3aa28ef00',
      shortCommit: '91bd3aa',
    })

    const { rerender } = render(<Probe enabled />)
    rerender(<Probe enabled />)

    await waitFor(() => {
      expect(screen.getByText('loaded v0.7.0')).toBeInTheDocument()
    })
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it('stays loaded with no metadata when the request fails', async () => {
    mockedFetch.mockResolvedValue(null)

    render(<Probe enabled />)

    await waitFor(() => {
      expect(screen.getByText('loaded none')).toBeInTheDocument()
    })
  })
})
