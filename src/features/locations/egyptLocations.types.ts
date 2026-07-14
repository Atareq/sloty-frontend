export interface EgyptCity {
  code: string
  name_en: string
  name_ar: string
  type: string
}

export interface EgyptGovernorate {
  code: string
  name_en: string
  name_ar: string
  region: string
  cities: EgyptCity[]
}

export interface EgyptLocationsResponse {
  governorates: EgyptGovernorate[]
}
