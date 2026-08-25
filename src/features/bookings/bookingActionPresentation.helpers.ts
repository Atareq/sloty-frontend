import { formatMoneyAmount } from '../../shared/utils/money'
import type { BookingListItem } from '../schedule/scheduleApi.types'
import {
  canBookingAddPayment,
  canBookingCancel,
  canBookingComplete,
  canBookingFreeHold,
  canBookingNoShow,
  hasRemainingAmount,
} from './bookingDisplay.helpers'

export type BookingPrimaryAction = 'PAYMENT' | 'COMPLETE'
export type BookingSecondaryAction = 'CANCEL' | 'NO_SHOW'

export interface BookingActionCapabilities {
  canAddPayment: boolean
  canCancel: boolean
  canComplete: boolean
  canFreeHold: boolean
  canNoShow: boolean
}

export interface BookingActionPresentation {
  stateMessage: string
  primaryAction: {
    type: BookingPrimaryAction
    label: string
  } | null
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

  switch (booking.status) {
    case 'HOLD':
      stateMessage = 'بانتظار العربون'
      if (
        capabilities.canAddPayment &&
        canBookingAddPayment(booking.status)
      ) {
        primaryAction = {
          type: 'PAYMENT',
          label: 'ضيف العربون وأكد الحجز',
        }
      }
      break
    case 'CONFIRMED':
      if (hasRemaining) {
        stateMessage = ended
          ? `الحجز خلص ولسه عليه ${formattedRemaining}`
          : `متبقي ${formattedRemaining}`
        if (
          capabilities.canAddPayment &&
          canBookingAddPayment(booking.status)
        ) {
          primaryAction = {
            type: 'PAYMENT',
            label: `حصّل ${formattedRemaining}`,
          }
        }
      } else if (ended) {
        stateMessage = 'الحجز خلص ولسه مقفلتوش'
        if (
          capabilities.canComplete &&
          canBookingComplete(booking.status)
        ) {
          primaryAction = { type: 'COMPLETE', label: 'إكمال' }
        }
      } else {
        stateMessage = 'مؤكد'
      }
      break
    case 'COMPLETED':
      stateMessage = 'مكتمل'
      break
    case 'CANCELLED':
      stateMessage = 'ملغي'
      break
    case 'NO_SHOW':
      stateMessage = 'عدم حضور'
      break
    case 'EXPIRED':
      stateMessage = 'انتهت المهلة'
      break
  }

  const secondaryActions: BookingSecondaryAction[] = []

  if (
    (capabilities.canCancel && canBookingCancel(booking.status)) ||
    (capabilities.canFreeHold && canBookingFreeHold(booking.status))
  ) {
    secondaryActions.push('CANCEL')
  }

  if (
    ended &&
    capabilities.canNoShow &&
    canBookingNoShow(booking.status)
  ) {
    secondaryActions.push('NO_SHOW')
  }

  return { primaryAction, secondaryActions, stateMessage }
}
