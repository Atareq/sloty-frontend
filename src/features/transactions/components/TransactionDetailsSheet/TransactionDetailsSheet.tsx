import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { financeCopy } from '../../../../shared/copy/appCopy'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { formatBookingDateWithWeekday, formatBookingTimeRange } from '../../../bookings/bookingDisplay.helpers'
import {
  getTransactionNotes,
  getTransactionType,
  isRefundTransaction,
  paymentMethodLabels,
  transactionTypeLabels,
  type Transaction,
} from '../../transactions.types'

export interface TransactionDetailsSheetProps {
  transaction: Transaction | null
  collectorName?: string | null
  error?: string | null
  isLoading?: boolean
  isOpen: boolean
  unsettledStateLabel: string
  onClose: () => void
}

/**
 * Canonical Transaction details surface. List rows stay lightweight; this
 * sheet renders fields guaranteed by GET transactions/{id}/ after the user
 * asks to view details.
 */
export function TransactionDetailsSheet({
  collectorName,
  error = null,
  isLoading = false,
  isOpen,
  onClose,
  transaction,
  unsettledStateLabel,
}: TransactionDetailsSheetProps) {
  const notes = transaction ? getTransactionNotes(transaction) : null
  const createdLabel = transaction
    ? formatArabicDateTime(transaction.created)
    : null
  const bookingDateLabel = transaction?.booking_start_time
    ? formatBookingDateWithWeekday(transaction.booking_start_time)
    : null
  const bookingSlotLabel =
    transaction?.booking_start_time && transaction.booking_end_time
      ? formatBookingTimeRange(
          transaction.booking_start_time,
          transaction.booking_end_time,
        )
      : createdLabel
  const transactionType = transaction
    ? getTransactionType(transaction)
    : 'PAYMENT'
  const isRefund = transaction ? isRefundTransaction(transaction) : false

  return (
    <AppSheet
      ariaLabel={financeCopy.transactionDetail}
      isOpen={isOpen}
      onRequestClose={onClose}
    >
      <div className="space-y-4 p-5 pt-14">
        <header>
          <h2 className="text-2xl font-extrabold text-[var(--sloty-text-primary)]">
            {financeCopy.transactionDetail}
          </h2>
        </header>

        {isLoading ? (
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {financeCopy.loadingTransactionDetail}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        {transaction && !isLoading ? (
          <>
            <div className="space-y-1">
              {bookingDateLabel ? (
                <p className="text-base font-bold text-[var(--sloty-text-primary)]">
                  {bookingDateLabel}
                </p>
              ) : null}
              {bookingSlotLabel ? (
                <p className="text-sm font-semibold text-[var(--sloty-text-primary)]">
                  {bookingSlotLabel}
                </p>
              ) : null}
              <p className="text-lg font-bold text-[var(--sloty-primary-dark)]">
                {formatMoneyAmount(transaction.amount, { suffix: 'ج.م' })} ·{' '}
                {paymentMethodLabels[transaction.payment_method]}
              </p>
              {collectorName ? (
                <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                  {financeCopy.collectedBy}: {collectorName}
                </p>
              ) : null}
              {transaction.court_name ? (
                <p className="text-sm font-medium text-[var(--sloty-text-muted)]">
                  {transaction.court_name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isRefund
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
                ].join(' ')}
              >
                {transactionTypeLabels[transactionType]}
              </span>
              {transaction.is_cancelled ? (
                <span className="rounded-full bg-[var(--sloty-danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--sloty-danger)]">
                  ملغية
                </span>
              ) : null}
              {typeof transaction.is_settled === 'boolean' ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {transaction.is_settled
                    ? financeCopy.received
                    : unsettledStateLabel}
                </span>
              ) : null}
            </div>

            {transaction.payment_method !== 'CASH' &&
            transaction.payment_reference ? (
              <section className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm">
                <h3 className="font-medium text-[var(--sloty-text-muted)]">
                  {financeCopy.paymentReference}
                </h3>
                <p className="mt-1 font-semibold text-[var(--sloty-text-primary)]">
                  {transaction.payment_reference}
                </p>
              </section>
            ) : null}

            {notes ? (
              <section className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm">
                <h3 className="font-medium text-[var(--sloty-text-muted)]">
                  {financeCopy.transactionNotes}
                </h3>
                <p className="mt-1 font-semibold text-[var(--sloty-text-primary)]">
                  {notes}
                </p>
              </section>
            ) : null}

            {transaction.cancellation_reason ? (
              <section className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2">
                <h3 className="font-semibold text-[var(--sloty-danger)]">
                  سبب الإلغاء
                </h3>
                <p className="mt-1 font-semibold text-[var(--sloty-danger)]">
                  {transaction.cancellation_reason}
                </p>
              </section>
            ) : null}

            <AppButton fullWidth onClick={onClose} type="button" variant="secondary">
              إغلاق
            </AppButton>
          </>
        ) : null}
      </div>
    </AppSheet>
  )
}
