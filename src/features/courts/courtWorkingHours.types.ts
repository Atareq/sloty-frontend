export type CourtWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface CourtWorkingHour {
  id?: number
  weekday: CourtWeekday
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

export interface CourtWorkingHourPayload {
  weekday: CourtWeekday
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

export interface CourtWorkingHoursResponse {
  court: number
  court_name: string
  working_hours: CourtWorkingHour[]
}

export interface CourtWorkingHoursPutPayload {
  working_hours: CourtWorkingHourPayload[]
}
