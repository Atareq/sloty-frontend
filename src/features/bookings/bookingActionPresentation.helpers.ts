import { formatMoneyAmount } from '../../shared/utils/money'
import {
  bookingActionCopy,
  bookingStatusCopy,
} from '../../shared/copy/appCopy'
import type { BookingListItem } from '../schedule/scheduleApi.types'
import {
  canBookingAddPayment,
  canBookingCancel,
  canBookingComplete,
  canBookingEditCustomer,
  canBookingFreeHold,
  canBookingNoShow,
  canBookingReschedule,
  hasRemainingAmount,
} from './bookingDisplay.helpers'
import { hasActiveRecurrence } from './bookingRecurrence.helpers'

export type BookingPrimaryAction = 'PAYMENT' | 'COMPLETE'
export type BookingSecondaryAction =
  | 'EDIT_CUSTOMER'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'NO_SHOW'
  | 'END_RECURRENCE'

export interface BookingActionCapabilities {
  canAddPayment: boolean
  canCancel: boolean
  canComplete: boolean
  canFreeHold: boolean
  canNoShow: boolean
  canEndRecurrence: boolean
  canEditCustomer: boolean
  canReschedule: boolean
}

export interface BookingActionPresentation {
  stateMessage: string
  primaryAction: {
    type: BookingPrimaryAction
    label: string
  } | null
  /** Visible beside the primary action for ended fully-paid operational decisions. */
  parallelActions: BookingSecondaryAction[]
  secondaryActions: BookingSecondaryAction[]
}

function isBookingEnded(booking: BookingListItem, now: Date): boolean {
  const endTime = new Date(booking.end_time)

  return !Number.isNaN(endTime.getTime()) && endTime.getTime() <= now.getTime()
}

/**
 * Translates backend booking state into one clear employee-facing next step.
 * Lifecycle helpers remain the source of valid statuses; callback availability
 * represents the actions implemented by the calling page.
 */
export function getBookingActionPresentation(
  booking: BookingListItem,
  capabilities: BookingActionCapabilities,
  now = new Date(),
): BookingActionPresentation {
  const hasRemaining = hasRemainingAmount(booking)
  const ended = isBookingEnded(booking, now)
  const formattedRemaining = formatMoneyAmount(booking.remaining_amount, {
    suffix: 'ج.م',
  })
  let stateMessage: string
  let primaryAction: BookingActionPresentation['primaryAction'] = null
  const parallelActions: BookingSecondaryAction[] = []

  switch (booking.status) {
    case 'HOLD':
      stateMessage = bookingStatusCopy.HOLD
      if (
        capabilities.canAddPayment &&
        canBookingAddPayment(booking.status)
      ) {
        primaryAction = {
          type: 'PAYMENT',
          label: bookingActionCopy.recordDepositAndConfirm,
        }
      }
      break
    case 'CONFIRMED':
      if (hasRemaining) {
        stateMessage = ended
          ? bookingActionCopy.remainingAfterEnd(formattedRemaining)
          : bookingActionCopy.remainingNow(formattedRemaining)
        if (
          capabilities.canAddPayment &&
          canBookingAddPayment(booking.status)
        ) {
          primaryAction = {
            type: 'PAYMENT',
            label: bookingActionCopy.collectRemaining(formattedRemaining),
          }
        }
      } else if (ended) {
        stateMessage = bookingActionCopy.endedNeedsClose
        if (
          capabilities.canComplete &&
          canBookingComplete(booking.status)
        ) {
          primaryAction = {
            type: 'COMPLETE',
            label: bookingActionCopy.complete,
          }
        }
        if (
          capabilities.canNoShow &&
          canBookingNoShow(booking.status)
        ) {
          parallelActions.push('NO_SHOW')
        }
      } else {
        stateMessage = bookingStatusCopy.CONFIRMED
      }
      break
    case 'COMPLETED':
      stateMessage = bookingStatusCopy.COMPLETED
      break
    case 'CANCELLED':
      stateMessage = bookingStatusCopy.CANCELLED
      break
    case 'NO_SHOW':
      stateMessage = bookingStatusCopy.NO_SHOW
      break
    case 'EXPIRED':
      stateMessage = bookingStatusCopy.EXPIRED
      break
  }

  const secondaryActions: BookingSecondaryAction[] = []

  if (
    capabilities.canEditCustomer &&
    canBookingEditCustomer(booking.status)
  ) {
    secondaryActions.push('EDIT_CUSTOMER')
  }

  if (capabilities.canReschedule && canBookingReschedule(booking)) {
    secondaryActions.push('RESCHEDULE')
  }

  if (
    (capabilities.canCancel && canBookingCancel(booking.status)) ||
    (capabilities.canFreeHold && canBookingFreeHold(booking.status))
  ) {
    secondaryActions.push('CANCEL')
  }

  if (
    ended &&
    capabilities.canNoShow &&
    canBookingNoShow(booking.status) &&
    !parallelActions.includes('NO_SHOW')
  ) {
    secondaryActions.push('NO_SHOW')
  }

  if (capabilities.canEndRecurrence && hasActiveRecurrence(booking)) {
    secondaryActions.push('END_RECURRENCE')
  }

  return { parallelActions, primaryAction, secondaryActions, stateMessage }
}
