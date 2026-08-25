import { SettlementPaymentTotals } from '../SettlementPaymentTotals/SettlementPaymentTotals'
import { SettlementPreviewSummary } from '../SettlementPreviewSummary/SettlementPreviewSummary'
import { SettlementPreviewTransactionsList } from '../SettlementPreviewTransactionsList/SettlementPreviewTransactionsList'
import type { SettlementPreview } from '../../settlements.types'

interface SettlementPreviewContentProps {
  preview: SettlementPreview
  mode?: 'management' | 'staff'
}

export function SettlementPreviewContent({
  mode = 'management',
  preview,
}: SettlementPreviewContentProps) {
  return (
    <>
      <SettlementPreviewSummary mode={mode} preview={preview} />
      <SettlementPaymentTotals
        totalsByPaymentMethod={preview.totals_by_payment_method}
      />
      <SettlementPreviewTransactionsList
        emptyMessage={
          mode === 'staff' ? 'مفيش مبلغ غير مسوى عندك دلوقتي.' : undefined
        }
        transactions={preview.transactions}
      />
    </>
  )
}
