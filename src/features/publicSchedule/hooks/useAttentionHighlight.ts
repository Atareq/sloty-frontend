import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook to trigger a temporary visual attention highlight (e.g. attention ring or glow)
 * that auto-resets after the specified duration (default 1500ms).
 * Cleanly cancels existing timers on re-trigger or unmount.
 */
export function useAttentionHighlight(durationMs = 1500) {
  const [isHighlighted, setIsHighlighted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const trigger = useCallback(() => {
    clearTimer()
    setIsHighlighted(true)
    timerRef.current = setTimeout(() => {
      setIsHighlighted(false)
      timerRef.current = null
    }, durationMs)
  }, [clearTimer, durationMs])

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  return { isHighlighted, trigger }
}

