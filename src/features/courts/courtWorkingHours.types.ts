export type CourtWeekday =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'

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
