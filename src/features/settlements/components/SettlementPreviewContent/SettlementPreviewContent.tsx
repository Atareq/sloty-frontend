import { SettlementPaymentTotals } from '../SettlementPaymentTotals/SettlementPaymentTotals'
import { SettlementPreviewSummary } from '../SettlementPreviewSummary/SettlementPreviewSummary'
import { SettlementPreviewTransactionsList } from '../SettlementPreviewTransactionsList/SettlementPreviewTransactionsList'
import type { SettlementPreview } from '../../settlements.types'

interface SettlementPreviewContentProps {
  preview: SettlementPreview
}

export function SettlementPreviewContent({
  preview,
}: SettlementPreviewContentProps) {
  return (
    <>
      <SettlementPreviewSummary preview={preview} />
      <SettlementPaymentTotals
        totalsByPaymentMethod={preview.totals_by_payment_method}
      />
      <SettlementPreviewTransactionsList transactions={preview.transactions} />
    </>
  )
}
