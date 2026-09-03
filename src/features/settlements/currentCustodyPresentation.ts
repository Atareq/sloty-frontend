import { financeCopy } from '../../shared/copy/appCopy'
import { formatMoneyAmount } from '../../shared/utils/money'

export type CurrentCustodyPresentationState =
  | 'empty'
  | 'zero'
  | 'positive'
  | 'negative'

export interface CurrentCustodyPresentation {
  amountLabel: string | null
  copy: string | null
  state: CurrentCustodyPresentationState
}

/**
 * Selects a display state from Backend custody fields without calculating money.
 * Negative custody deliberately has no invented product sentence while its signed
 * Backend value remains visible for the pending Product/Backend clarification.
 */
export function getCurrentCustodyPresentation({
  netAmount,
  transactionCount,
}: {
  netAmount: string
  transactionCount: number
}): CurrentCustodyPresentation {
  if (transactionCount === 0) {
    return {
      amountLabel: null,
      copy: financeCopy.currentCustodyEmpty,
      state: 'empty',
    }
  }

  const numericAmount = Number(netAmount)

  if (numericAmount === 0) {
    return {
      amountLabel: formatMoneyAmount(netAmount, { suffix: 'ج.م' }),
      copy: financeCopy.currentCustodyZero,
      state: 'zero',
    }
  }

  if (numericAmount > 0) {
    const amountLabel = formatMoneyAmount(netAmount, { suffix: 'ج.م' })

    return {
      amountLabel,
      copy: financeCopy.currentCustodyPositive(amountLabel),
      state: 'positive',
    }
  }

  return {
    amountLabel: formatMoneyAmount(netAmount, { suffix: 'ج.م' }),
    copy: null,
    state: 'negative',
  }
}
