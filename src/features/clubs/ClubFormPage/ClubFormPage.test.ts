import { describe, expect, it } from 'vitest'
import { buildClubPayload } from './clubForm.helpers'

describe('buildClubPayload', () => {
  it('sends governorate and city codes in club create payloads', () => {
    const payload = buildClubPayload(
      {
        name: ' نادي النصر ',
        slug: ' nasr-club ',
        governorate: 'ASSIUT',
        city: 'ASSIUT_MARKAZ',
        address: ' شارع جانبي ',
        phone_number: '+201012345678',
        notes: '',
        is_active: true,
      },
      true,
    )

    expect(payload).toEqual({
      name: 'نادي النصر',
      slug: 'nasr-club',
      governorate: 'ASSIUT',
      city: 'ASSIUT_MARKAZ',
      address: 'شارع جانبي',
      phone_number: '+201012345678',
      notes: undefined,
      is_active: true,
    })
    expect(payload).not.toHaveProperty('manager_can_settle_transactions')
    expect(payload).not.toHaveProperty('manager_can_change_pricing')
  })
})
