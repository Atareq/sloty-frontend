import { describe, expect, it } from 'vitest'
import { buildClubPayload } from './clubForm.helpers'

describe('buildClubPayload', () => {
  it('sends governorate and city codes in club create payloads', () => {
    expect(
      buildClubPayload(
        {
          name: ' نادي النصر ',
          slug: ' nasr-club ',
          governorate: 'ASSIUT',
          city: 'ASSIUT_MARKAZ',
          address: ' شارع جانبي ',
          phone_number: '',
          notes: '',
          is_active: true,
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        },
        true,
      ),
    ).toEqual({
      name: 'نادي النصر',
      slug: 'nasr-club',
      governorate: 'ASSIUT',
      city: 'ASSIUT_MARKAZ',
      address: 'شارع جانبي',
      phone_number: undefined,
      notes: undefined,
      is_active: true,
      manager_can_settle_transactions: false,
      manager_can_change_pricing: false,
    })
  })
})
