export const currentFinancialStateChangedEvent =
  'sloty:current-financial-state-changed'

export type CurrentFinancialStateChangeReason =
  | 'booking-payment'
  | 'booking-cancellation'
  | 'transaction-cancellation'
  | 'settlement-create'
  | 'settlement-stale'
  | 'settlement-status'

export interface CurrentFinancialStateChangedDetail {
  clubSlug?: string
  reason: CurrentFinancialStateChangeReason
}

/**
 * Announces that backend financial truth may have changed.
 *
 * Pages still own their normal loaders; this tiny event only tells mounted
 * current-custody/settlement surfaces to run those authoritative loaders again.
 */
export function notifyCurrentFinancialStateChanged(
  detail: CurrentFinancialStateChangedDetail,
): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<CurrentFinancialStateChangedDetail>(
      currentFinancialStateChangedEvent,
      { detail },
    ),
  )
}

export function subscribeCurrentFinancialStateChanged(
  listener: (detail: CurrentFinancialStateChangedDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleEvent = (event: Event): void => {
    listener((event as CustomEvent<CurrentFinancialStateChangedDetail>).detail)
  }

  window.addEventListener(currentFinancialStateChangedEvent, handleEvent)

  return () => {
    window.removeEventListener(currentFinancialStateChangedEvent, handleEvent)
  }
}
