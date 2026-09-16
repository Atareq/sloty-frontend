import { AppButton } from '../AppButton/AppButton'

export interface AppPaginationProps {
  currentPage: number
  totalCount: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
  itemLabel?: string
  ariaLabel?: string
}

/**
 * Shared Sloty pagination component.
 *
 * 'التالي' (Next) is styled as a primary action using Sloty green (variant="primary").
 * 'السابق' (Previous) uses secondary/neutral styling (variant="secondary").
 */
export function AppPagination({
  currentPage,
  totalCount,
  hasNext,
  hasPrevious,
  onPageChange,
  itemLabel = 'عنصر',
  ariaLabel = 'التنقل بين الصفحات',
}: AppPaginationProps) {
  if (!hasNext && !hasPrevious) {
    return null
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex items-center justify-center gap-3 py-4"
    >
      <AppButton
        disabled={!hasPrevious}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        type="button"
        variant="secondary"
      >
        السابق
      </AppButton>
      <span className="text-sm font-bold text-[var(--sloty-text-muted)]">
        صفحة {currentPage} · {totalCount} {itemLabel}
      </span>
      <AppButton
        disabled={!hasNext}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="primary"
      >
        التالي
      </AppButton>
    </nav>
  )
}

