import { useOfflineReadonly } from '../../hooks/useOfflineReadonly'

export interface NewBookingFABProps {
  onClick?: () => void
}

/**
 * Canonical floating action that returns authorized mobile users to Schedule.
 */
export function NewBookingFAB({ onClick }: NewBookingFABProps) {
  const { isOffline, offlineMessage } = useOfflineReadonly()

  return (
    <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+1.25rem)] left-1/2 z-40 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 md:hidden">
      <button
        className="sloty-green-surface-button flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[var(--sloty-primary-dark)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isOffline}
        onClick={onClick}
        title={isOffline ? offlineMessage : undefined}
        type="button"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          +
        </span>
        حجز جديد
      </button>
    </div>
  )
}
