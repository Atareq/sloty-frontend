import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { useAppOverlayRegistration } from './appSheetOverlay'

export interface AppSheetProps {
  children: ReactNode
  isOpen?: boolean
  title?: string
  ariaLabel?: string
  onRequestClose: () => boolean | void
  dismissOnBackdrop?: boolean
  dismissOnEscape?: boolean
  className?: string
}

/**
 * Canonical Sloty shell for modal tasks and temporary details.
 *
 * It owns generic dismissal, history, focus, scrolling, and responsive
 * presentation. Feature components remain responsible for form/domain state.
 */
export function AppSheet({
  ariaLabel,
  children,
  className = 'md:max-w-md',
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  isOpen = true,
  onRequestClose,
  title,
}: AppSheetProps) {
  const sheetId = `app-sheet-${useId()}`
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const requestClose = useAppOverlayRegistration(isOpen, onRequestClose)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    openerRef.current = document.activeElement as HTMLElement | null
    const frameId = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      openerRef.current?.focus()
    }
  }, [isOpen, requestClose, sheetId])

  useEffect(() => {
    if (!isOpen || !dismissOnEscape) {
      return
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [dismissOnEscape, isOpen, requestClose, sheetId])

  function handleFocusTrap(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') {
      return
    }

    const focusableElements = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    )

    if (focusableElements.length === 0) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements.at(-1)

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      data-testid="app-sheet-backdrop"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          requestClose()
        }
      }}
    >
      <div
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? `${sheetId}-title` : undefined}
        aria-modal="true"
        className={[
          'relative max-h-[85dvh] w-full overflow-x-hidden overflow-y-auto rounded-t-3xl bg-[var(--sloty-surface)] pb-[max(env(safe-area-inset-bottom),0px)] shadow-2xl md:rounded-3xl',
          className,
        ].join(' ')}
        onKeyDown={handleFocusTrap}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="إغلاق"
          className="absolute left-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-[var(--sloty-text-muted)] transition hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
          onClick={requestClose}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>
        {title ? (
          <h2 className="sr-only" id={`${sheetId}-title`}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  )
}
