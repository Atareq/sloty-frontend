import { useCallback, useEffect, useMemo, useState } from 'react'

export type PwaInstallKind = 'chromium' | 'ios'
export type PwaInstallOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptChoice {
  outcome: PwaInstallOutcome
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

type StandaloneNavigator = Navigator & {
  standalone?: boolean
}

type MatchMediaLike = (
  query: string,
) => Pick<MediaQueryList, 'matches'>

/** Detects installed/standalone mode across Chromium and iOS Safari. */
export function isRunningStandalone(
  matchMedia: MatchMediaLike | undefined =
    typeof window === 'undefined' ? undefined : window.matchMedia?.bind(window),
  iosStandalone =
    typeof navigator === 'undefined'
      ? false
      : (navigator as StandaloneNavigator).standalone === true,
): boolean {
  return Boolean(matchMedia?.('(display-mode: standalone)').matches) || iosStandalone
}

/**
 * iOS Safari does not expose beforeinstallprompt, so it receives concise
 * Add-to-Home-Screen instructions instead of a fake install action.
 */
export function isIosSafari(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  platform = typeof navigator === 'undefined' ? '' : navigator.platform,
  maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
): boolean {
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(userAgent)

  return isIosDevice && isSafari
}

export interface PwaInstallState {
  dismissInstall: () => void
  installKind: PwaInstallKind | null
  isInstalled: boolean
  promptInstall: () => Promise<PwaInstallOutcome | null>
}

/** Centralized install eligibility and browser-prompt lifecycle. */
export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone)
  const iosSafari = isIosSafari()

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault()

      if (!isRunningStandalone()) {
        setDeferredPrompt(event as BeforeInstallPromptEvent)
      }
    }

    function handleInstalled(): void {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      )
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const dismissInstall = useCallback((): void => {
    setDeferredPrompt(null)
    setIsDismissed(true)
  }, [])

  const promptInstall = useCallback(async (): Promise<PwaInstallOutcome | null> => {
    if (!deferredPrompt || isInstalled) {
      return null
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    setDeferredPrompt(null)

    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
    } else {
      setIsDismissed(true)
    }

    return choice.outcome
  }, [deferredPrompt, isInstalled])

  const installKind = useMemo<PwaInstallKind | null>(() => {
    if (isInstalled || isDismissed) {
      return null
    }

    if (iosSafari) {
      return 'ios'
    }

    return deferredPrompt ? 'chromium' : null
  }, [deferredPrompt, iosSafari, isDismissed, isInstalled])

  return {
    dismissInstall,
    installKind,
    isInstalled,
    promptInstall,
  }
}
