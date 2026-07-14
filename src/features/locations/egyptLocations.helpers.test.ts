import { describe, expect, it } from 'vitest'
import {
  findCityByCode,
  findGovernorateByCode,
  getCityLabel,
  getGovernorateLabel,
} from './egyptLocations.helpers'
import type { EgyptLocationsResponse } from './egyptLocations.types'

const locations: EgyptLocationsResponse = {
  governorates: [
    {
      code: 'ASSIUT',
      name_en: 'Assiut',
      name_ar: 'أسيوط',
      region: 'CENTRAL_UPPER_EGYPT',
      cities: [
        {
          code: 'ASSIUT_MARKAZ',
          name_en: 'Assiut Markaz',
          name_ar: 'مركز أسيوط',
          type: 'markaz',
        },
      ],
    },
  ],
}

describe('egyptLocations helpers', () => {
  it('finds governorates and cities by backend code', () => {
    const governorate = findGovernorateByCode(locations, 'ASSIUT')

    expect(governorate?.name_ar).toBe('أسيوط')
    expect(findCityByCode(governorate, 'ASSIUT_MARKAZ')?.name_ar).toBe(
      'مركز أسيوط',
    )
  })

  it('returns Arabic labels for known codes', () => {
    expect(getGovernorateLabel(locations, 'ASSIUT')).toBe('أسيوط')
    expect(getCityLabel(locations, 'ASSIUT', 'ASSIUT_MARKAZ')).toBe(
      'مركز أسيوط',
    )
  })

  it('falls back to raw codes when lookup data is missing or unknown', () => {
    expect(getGovernorateLabel(null, 'UNKNOWN_GOV')).toBe('UNKNOWN_GOV')
    expect(getCityLabel(locations, 'ASSIUT', 'UNKNOWN_CITY')).toBe(
      'UNKNOWN_CITY',
    )
  })
})
