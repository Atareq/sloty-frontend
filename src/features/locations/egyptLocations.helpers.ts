import type {
  EgyptCity,
  EgyptGovernorate,
  EgyptLocationsResponse,
} from './egyptLocations.types'

export function findGovernorateByCode(
  locations: EgyptLocationsResponse | null,
  code: string,
): EgyptGovernorate | undefined {
  return locations?.governorates.find(
    (governorate) => governorate.code === code,
  )
}

export function findCityByCode(
  governorate: EgyptGovernorate | undefined,
  cityCode: string,
): EgyptCity | undefined {
  return governorate?.cities.find((city) => city.code === cityCode)
}

export function getGovernorateLabel(
  locations: EgyptLocationsResponse | null,
  code: string,
): string {
  return findGovernorateByCode(locations, code)?.name_ar || code
}

export function getCityLabel(
  locations: EgyptLocationsResponse | null,
  governorateCode: string,
  cityCode: string,
): string {
  const governorate = findGovernorateByCode(locations, governorateCode)
  return findCityByCode(governorate, cityCode)?.name_ar || cityCode
}
