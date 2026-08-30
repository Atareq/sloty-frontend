import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isIosSafari,
  isRunningStandalone,
  usePwaInstall,
} from './pwaInstall'

function InstallHarness() {
  const {
    dismissInstall,
    installKind,
    isInstalled,
    promptInstall,
  } = usePwaInstall()

  return (
    <>
      <p data-testid="install-kind">{installKind ?? 'none'}</p>
      <p data-testid="installed">{String(isInstalled)}</p>
      <button onClick={dismissInstall} type="button">
        dismiss
      </button>
      <button onClick={() => void promptInstall()} type="button">
        install
      </button>
    </>
  )
}

function createInstallEvent(outcome: 'accepted' | 'dismissed') {
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = new Event('beforeinstallprompt', { cancelable: true })

  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: {
      value: Promise.resolve({ outcome, platform: 'web' }),
    },
  })

  return { event, prompt }
}

describe('PWA install logic', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
      })),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('captures beforeinstallprompt and consumes it once', async () => {
    const user = userEvent.setup()
    const { event, prompt } = createInstallEvent('dismissed')

    render(<InstallHarness />)

    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByTestId('install-kind')).toHaveTextContent('chromium')
    expect(prompt).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'install' }))

    expect(prompt).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByTestId('install-kind')).toHaveTextContent('none')
    })
  })

  it('marks accepted installation and clears browser-prompt state', async () => {
    const user = userEvent.setup()
    const { event } = createInstallEvent('accepted')

    render(<InstallHarness />)
    act(() => window.dispatchEvent(event))
    await user.click(screen.getByRole('button', { name: 'install' }))

    await waitFor(() => {
      expect(screen.getByTestId('installed')).toHaveTextContent('true')
      expect(screen.getByTestId('install-kind')).toHaveTextContent('none')
    })
  })

  it('dismisses the captured prompt only for the current app session', async () => {
    const user = userEvent.setup()
    const { event } = createInstallEvent('accepted')

    render(<InstallHarness />)
    act(() => window.dispatchEvent(event))
    await user.click(screen.getByRole('button', { name: 'dismiss' }))

    expect(screen.getByTestId('install-kind')).toHaveTextContent('none')
  })

  it('hides install eligibility in standalone mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      })),
    )
    const { event } = createInstallEvent('accepted')

    render(<InstallHarness />)
    act(() => window.dispatchEvent(event))

    expect(screen.getByTestId('installed')).toHaveTextContent('true')
    expect(screen.getByTestId('install-kind')).toHaveTextContent('none')
  })

  it('keeps unsupported browsers free of a broken install action', () => {
    render(<InstallHarness />)

    expect(screen.getByTestId('install-kind')).toHaveTextContent('none')
  })

  it('detects iOS Safari but excludes Chromium-family iOS browsers', () => {
    const safariUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
    const chromeUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1'

    expect(isIosSafari(safariUa, 'iPhone', 5)).toBe(true)
    expect(isIosSafari(chromeUa, 'iPhone', 5)).toBe(false)
  })

  it('uses iOS Add-to-Home-Screen fallback only when not installed', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    )
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('iPhone')

    render(<InstallHarness />)

    expect(screen.getByTestId('install-kind')).toHaveTextContent('ios')
  })

  it('recognizes both display-mode and iOS standalone signals', () => {
    expect(isRunningStandalone(() => ({ matches: true }), false)).toBe(true)
    expect(isRunningStandalone(() => ({ matches: false }), true)).toBe(true)
    expect(isRunningStandalone(() => ({ matches: false }), false)).toBe(false)
  })
})
