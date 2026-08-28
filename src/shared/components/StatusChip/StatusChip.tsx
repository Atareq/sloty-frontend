import { bookingStatusCopy } from '../../copy/appCopy'

export type SlotyStatus =
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'noShow'
  | 'expired'

export type BookingStatusChipValue =
  | SlotyStatus
  | 'HOLD'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED'

export interface StatusChipProps {
  status: BookingStatusChipValue
}

const backendToChipStatus: Record<
  Exclude<BookingStatusChipValue, SlotyStatus>,
  SlotyStatus
> = {
  HOLD: 'hold',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'noShow',
  EXPIRED: 'expired',
}

const statusMap: Record<SlotyStatus, { label: string; className: string }> = {
  hold: {
    label: bookingStatusCopy.HOLD,
    className:
      'bg-[var(--sloty-hold-soft)] text-[var(--sloty-hold)] ring-[var(--sloty-hold)]/20',
  },
  confirmed: {
    label: bookingStatusCopy.CONFIRMED,
    className:
      'bg-[var(--sloty-success-soft)] text-[var(--sloty-success)] ring-[var(--sloty-success)]/20',
  },
  completed: {
    label: bookingStatusCopy.COMPLETED,
    className:
      'bg-[var(--sloty-completed-soft)] text-[var(--sloty-completed)] ring-[var(--sloty-completed)]/20',
  },
  cancelled: {
    label: bookingStatusCopy.CANCELLED,
    className:
      'bg-[var(--sloty-danger-soft)] text-[var(--sloty-danger)] ring-[var(--sloty-danger)]/20',
  },
  noShow: {
    label: bookingStatusCopy.NO_SHOW,
    className:
      'bg-[var(--sloty-no-show-soft)] text-[var(--sloty-no-show)] ring-[var(--sloty-no-show)]/20',
  },
  expired: {
    label: bookingStatusCopy.EXPIRED,
    className:
      'bg-[var(--sloty-expired-soft)] text-[var(--sloty-expired-text)] ring-[var(--sloty-expired)]/30',
  },
}

function getStatusChipTone(status: BookingStatusChipValue): SlotyStatus {
  if (status in backendToChipStatus) {
    return backendToChipStatus[status as keyof typeof backendToChipStatus]
  }

  return status as SlotyStatus
}

/**
 * Shared booking-status chip using Sloty semantic tokens.
 *
 * Recurrence is metadata and must not receive a separate status color.
 */
export function StatusChip({ status }: StatusChipProps) {
  const statusConfig = statusMap[getStatusChipTone(status)]

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
