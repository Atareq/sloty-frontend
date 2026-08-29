import { useLayoutEffect, useState, type RefObject } from 'react'

export const HEADER_COLLAPSE_START_PX = 16
export const HEADER_COLLAPSE_END_PX = 96
export const HEADER_COLLAPSE_CSS_VAR = '--sloty-header-collapse'

export type PageHeaderScrollState = 'expanded' | 'transitioning' | 'collapsed'

/**
 * Maps window scrollY into 0..1 collapse progress.
 *
 * A short dead zone avoids hiding context at 1px. The range is short so the
 * large header does not linger as a floating card.
 */
export function getPageHeaderScrollProgress(scrollY: number): number {
  if (scrollY <= HEADER_COLLAPSE_START_PX) {
    return 0
  }

  if (scrollY >= HEADER_COLLAPSE_END_PX) {
    return 1
  }

  return (
    (scrollY - HEADER_COLLAPSE_START_PX) /
    (HEADER_COLLAPSE_END_PX - HEADER_COLLAPSE_START_PX)
  )
}

export function getPageHeaderScrollState(
  progress: number,
): PageHeaderScrollState {
  if (progress <= 0) {
    return 'expanded'
  }

  if (progress >= 1) {
    return 'collapsed'
  }

  return 'transitioning'
}

/**
 * Shared PageHeader scroll driver.
 *
 * Listens to window/document scroll only so AppSheet internal scrolling cannot
 * collapse the shell header. Visual progress is a CSS variable updated inside
 * requestAnimationFrame; React only re-renders when the discrete state bucket
 * changes.
 */
export function usePageHeaderScroll(
  headerRef: RefObject<HTMLElement | null>,
  resetKey?: string,
): PageHeaderScrollState {
  const [state, setState] = useState<PageHeaderScrollState>('expanded')

  useLayoutEffect(() => {
    const header = headerRef.current
    let frameId = 0
    let isScheduled = false

    function apply(scrollY: number): void {
      const progress = getPageHeaderScrollProgress(scrollY)

      if (header) {
        header.style.setProperty(HEADER_COLLAPSE_CSS_VAR, progress.toFixed(3))
      }

      const nextState = getPageHeaderScrollState(progress)
      setState((currentState) =>
        currentState === nextState ? currentState : nextState,
      )
    }

    function handleScroll(): void {
      if (isScheduled) {
        return
      }

      isScheduled = true
      frameId = window.requestAnimationFrame(() => {
        isScheduled = false
        frameId = 0
        apply(window.scrollY)
      })
    }

    apply(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      header?.style.removeProperty(HEADER_COLLAPSE_CSS_VAR)
    }
  }, [headerRef, resetKey])

  return state
}
