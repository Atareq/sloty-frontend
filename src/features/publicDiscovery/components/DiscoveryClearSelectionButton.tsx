import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'

export interface DiscoveryClearSelectionButtonProps {
  /** True while the selector has nothing to clear. */
  disabled: boolean
  onClear: () => void
}

/**
 * `مسح الاختيار` — the one sticky footer action shared by the Court, day, and
 * times selector sheets.
 *
 * It is always rendered so visitors learn one predictable place to clear a
 * selector, and is disabled when that selector is empty. It is a secondary,
 * non-destructive action, so it reuses the Sloty light-yellow secondary
 * treatment (`--sloty-hold-soft`) instead of red.
 */
export function DiscoveryClearSelectionButton({
  disabled,
  onClear,
}: DiscoveryClearSelectionButtonProps) {
  return (
    <AppButton
      className="!border-amber-200/80 !bg-[var(--sloty-hold-soft)] !text-amber-950 hover:!border-amber-300 hover:!bg-amber-100"
      data-testid="discovery-clear-selection"
      disabled={disabled}
      fullWidth
      onClick={onClear}
      type="button"
      variant="secondary"
    >
      {courtDiscoveryCopy.clearSelection}
    </AppButton>
  )
}
