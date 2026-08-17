export type SlotyStatus =
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'noShow'
  | 'expired'

export interface StatusChipProps {
  status: SlotyStatus
}

const statusMap: Record<SlotyStatus, { label: string; className: string }> = {
  hold: {
    label: 'بانتظار العربون',
    className:
      'bg-[var(--sloty-hold-soft)] text-[var(--sloty-hold)] ring-[var(--sloty-hold)]/20',
  },
  confirmed: {
    label: 'مؤكد',
    className:
      'bg-[var(--sloty-success-soft)] text-[var(--sloty-success)] ring-[var(--sloty-success)]/20',
  },
  completed: {
    label: 'مكتمل',
    className:
      'bg-[var(--sloty-completed-soft)] text-[var(--sloty-completed)] ring-[var(--sloty-completed)]/20',
  },
  cancelled: {
    label: 'ملغي',
    className:
      'bg-[var(--sloty-danger-soft)] text-[var(--sloty-danger)] ring-[var(--sloty-danger)]/20',
  },
  noShow: {
    label: 'لم يحضر',
    className:
      'bg-[var(--sloty-no-show-soft)] text-[var(--sloty-no-show)] ring-[var(--sloty-no-show)]/20',
  },
  expired: {
    label: 'منتهي',
    className:
      'bg-[var(--sloty-expired-soft)] text-[var(--sloty-expired-text)] ring-[var(--sloty-expired)]/30',
  },
}

/**
 * Visual-only booking status chip.
 *
 * The status vocabulary mirrors current product docs for UI placeholders, but
 * this component does not enforce lifecycle rules or backend state.
 */
export function StatusChip({ status }: StatusChipProps) {
  const statusConfig = statusMap[status]

  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1',
        statusConfig.className,
      ].join(' ')}
    >
      {statusConfig.label}
    </span>
  )
}
