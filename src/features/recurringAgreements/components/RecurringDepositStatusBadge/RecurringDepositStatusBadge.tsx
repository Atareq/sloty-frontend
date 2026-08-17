import {
  recurringDepositStatusLabels,
  type RecurringDepositStatus,
} from '../../recurringAgreements.types'

const badgeClasses: Record<RecurringDepositStatus, string> = {
  HELD: 'bg-amber-100 text-amber-900',
  REFUND_DUE: 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
  REFUNDED: 'bg-slate-100 text-slate-700',
  FORFEITED: 'bg-[var(--sloty-danger-soft)] text-[var(--sloty-danger)]',
}

export interface RecurringDepositStatusBadgeProps {
  status: RecurringDepositStatus
}

export function RecurringDepositStatusBadge({
  status,
}: RecurringDepositStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-black',
        badgeClasses[status],
      ].join(' ')}
    >
      {recurringDepositStatusLabels[status]}
    </span>
  )
}

