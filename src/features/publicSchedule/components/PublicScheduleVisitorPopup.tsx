import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { publicScheduleVisitorCopy } from '../../../shared/copy/appCopy'

export interface PublicScheduleVisitorPopupProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Informational guidance popup shown when an unauthenticated visitor clicks an available schedule slot.
 *
 * It informs players that self-booking is coming soon, and guides staff members
 * to log in from the header if they need to book.
 * Provides a single 'استمرار' primary action that dismisses the popup while
 * strictly preserving the user's schedule position and scroll state.
 */
export function PublicScheduleVisitorPopup({
  isOpen,
  onClose,
}: PublicScheduleVisitorPopupProps) {
  return (
    <AppSheet
      className="md:max-w-md"
      isOpen={isOpen}
      onRequestClose={onClose}
      title={publicScheduleVisitorCopy.title}
    >
      <div className="space-y-4 p-5 sm:p-6 text-right" dir="rtl">
        <p className="text-sm font-semibold leading-relaxed text-[var(--sloty-text-muted)]">
          {publicScheduleVisitorCopy.bodyPlayer}
        </p>

        <p className="text-base font-black text-[var(--sloty-primary-dark)]">
          {publicScheduleVisitorCopy.stayTuned}
        </p>

        <p className="text-xs font-semibold leading-relaxed text-[var(--sloty-text-muted)]">
          {publicScheduleVisitorCopy.bodyStaff}
        </p>

        <div className="pt-2">
          <AppButton
            fullWidth
            onClick={onClose}
            type="button"
            variant="primary"
          >
            {publicScheduleVisitorCopy.continueAction}
          </AppButton>
        </div>
      </div>
    </AppSheet>
  )
}
