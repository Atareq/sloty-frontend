import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from 'react'

interface ActiveOverlay {
  id: string
  requestClose: () => boolean | void
}

const historyStateKey = '__slotyAppSheet'
const activeOverlays: ActiveOverlay[] = []
const overlayListeners = new Set<() => void>()
let historyListenerAttached = false
let orphanedOverlayEntry = false
let previousBodyOverflow: string | null = null

function emitOverlayChange(): void {
  overlayListeners.forEach((listener) => listener())
}

function hasOverlayHistoryEntry(): boolean {
  return Boolean(window.history.state?.[historyStateKey])
}

function pushOverlayHistoryEntry(): void {
  window.history.pushState(
    { ...window.history.state, [historyStateKey]: true },
    '',
    window.location.href,
  )
}

function handleHistoryBack(): void {
  const topOverlay = activeOverlays.at(-1)
  if (!topOverlay) {
    if (orphanedOverlayEntry) {
      orphanedOverlayEntry = false
      window.history.back()
    }
    return
  }

  const wasPrevented = topOverlay.requestClose() === false
  queueMicrotask(() => {
    if (
      (wasPrevented || activeOverlays.length > 0) &&
      !hasOverlayHistoryEntry()
    ) {
      pushOverlayHistoryEntry()
    }
  })
}

function registerOverlay(overlay: ActiveOverlay): () => void {
  activeOverlays.push(overlay)

  if (activeOverlays.length === 1) {
    if (!historyListenerAttached) {
      window.addEventListener('popstate', handleHistoryBack)
      historyListenerAttached = true
    }
    if (!hasOverlayHistoryEntry()) {
      pushOverlayHistoryEntry()
    }
    orphanedOverlayEntry = false
    if (previousBodyOverflow === null) {
      previousBodyOverflow = document.body.style.overflow
    }
    document.body.style.overflow = 'hidden'
  }

  emitOverlayChange()

  return () => {
    const overlayIndex = activeOverlays.findIndex(({ id }) => id === overlay.id)
    if (overlayIndex >= 0) {
      activeOverlays.splice(overlayIndex, 1)
    }

    queueMicrotask(() => {
      if (activeOverlays.length === 0) {
        document.body.style.overflow = previousBodyOverflow ?? ''
        previousBodyOverflow = null
        if (hasOverlayHistoryEntry()) {
          orphanedOverlayEntry = true
        }
      }
    })
    emitOverlayChange()
  }
}

function subscribeToOverlayState(listener: () => void): () => void {
  overlayListeners.add(listener)
  return () => overlayListeners.delete(listener)
}

/** Registers temporary UI with the shared modal Back/stack mechanism. */
export function useAppOverlayRegistration(
  isOpen: boolean,
  onRequestClose: () => boolean | void,
): () => boolean | void {
  const reactId = useId()
  const overlayId = `app-overlay-${reactId}`
  const closeRequestRef = useRef(onRequestClose)

  useEffect(() => {
    closeRequestRef.current = onRequestClose
  }, [onRequestClose])

  const requestClose = useCallback((): boolean | void => {
    if (activeOverlays.at(-1)?.id !== overlayId) {
      return false
    }
    return closeRequestRef.current()
  }, [overlayId])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    return registerOverlay({ id: overlayId, requestClose })
  }, [isOpen, overlayId, requestClose])

  return requestClose
}

/** Returns whether shared modal task UI is currently active. */
export function useHasActiveAppSheet(): boolean {
  return useSyncExternalStore(
    subscribeToOverlayState,
    () => activeOverlays.length > 0,
    () => false,
  )
}
