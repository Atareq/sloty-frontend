export interface NewBookingFABProps {
  onClick?: () => void
}

/**
 * Floating "new booking" action for staff mobile screens.
 *
 * It is visually ready but intentionally does not implement booking creation.
 * Feature screens can pass an `onClick` later when that flow is designed. It
 * hides from tablet/desktop layouts, where this action belongs in a toolbar.
 */
export function NewBookingFAB({ onClick }: NewBookingFABProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-3 md:hidden">
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sloty-primary)] text-[15px] font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[var(--sloty-primary-dark)] active:scale-[0.99]"
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
