export type CourtWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface CourtPricingPeriod {
  id?: number
  starts_at: string
  ends_at: string
  price: string
}

export interface CourtWorkingDay {
  weekday: CourtWeekday
  pricing_periods: CourtPricingPeriod[]
}

export interface CourtWorkingHoursResponse {
  court: number
  court_name: string
  pricing_configured: boolean
  working_hours: CourtWorkingDay[]
}

export interface CourtPricingPeriodPayload {
  starts_at: string
  ends_at: string
  price: string
}

export interface CourtWorkingDayPayload {
  weekday: CourtWeekday
  pricing_periods: CourtPricingPeriodPayload[]
}

export interface CourtWorkingHoursApiResponse {
  court: number
  court_name: string
  pricing_configured?: boolean
  working_hours?: CourtWorkingDay[]
}

export interface UpdateCourtWorkingHoursPayload {
  working_hours: CourtWorkingDayPayload[]
}
