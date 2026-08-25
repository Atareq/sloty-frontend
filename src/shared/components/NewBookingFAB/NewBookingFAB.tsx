export interface NewBookingFABProps {
  onClick?: () => void
}

/**
 * Canonical floating action that returns authorized mobile users to Schedule.
 */
export function NewBookingFAB({ onClick }: NewBookingFABProps) {
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 md:hidden">
      <button
        className="sloty-green-surface-button flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[var(--sloty-primary-dark)] active:scale-[0.99]"
        onClick={onClick}
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
