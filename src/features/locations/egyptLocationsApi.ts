import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { EgyptLocationsResponse } from './egyptLocations.types'

/**
 * Fetches backend-controlled Egypt governorate/city options.
 *
 * Club forms must submit location codes from this lookup instead of hardcoded
 * frontend lists or display labels.
 */
export function fetchEgyptLocations(): Promise<EgyptLocationsResponse> {
  return apiRequest<EgyptLocationsResponse>(apiEndpoints.egyptLocations)
}
