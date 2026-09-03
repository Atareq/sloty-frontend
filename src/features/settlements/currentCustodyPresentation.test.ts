import { describe, expect, it } from 'vitest'
import { getCurrentCustodyPresentation } from './currentCustodyPresentation'

describe('getCurrentCustodyPresentation', () => {
  it('uses transaction count, not amount alone, for the true empty state', () => {
    expect(
      getCurrentCustodyPresentation({ transactionCount: 0, netAmount: '0.00' }),
    ).toEqual({
      amountLabel: null,
      copy: 'لا توجد مبالغ مستحقة للتسليم حاليًا',
      state: 'empty',
    })
  })

  it('keeps zero-net custody visible when transactions exist', () => {
    expect(
      getCurrentCustodyPresentation({ transactionCount: 2, netAmount: '0.00' }),
    ).toEqual({
      amountLabel: '0.00 ج.م',
      copy: 'صافي المبلغ المستحق حاليًا: 0 ج.م',
      state: 'zero',
    })
  })

  it('formats the Backend positive value without reconstructing it', () => {
    expect(
      getCurrentCustodyPresentation({
        transactionCount: 3,
        netAmount: '1250.00',
      }),
    ).toEqual({
      amountLabel: '1,250.00 ج.م',
      copy: 'المبلغ المستحق للتسليم: 1,250.00 ج.م',
      state: 'positive',
    })
  })

  it('preserves a negative Backend value without positive custody wording', () => {
    expect(
      getCurrentCustodyPresentation({
        transactionCount: 1,
        netAmount: '-200.00',
      }),
    ).toEqual({
      amountLabel: '-200.00 ج.م',
      copy: null,
      state: 'negative',
    })
  })
})
