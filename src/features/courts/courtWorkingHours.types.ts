export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface CourtWorkingHour {
  id: number
  court: number
  weekday: Weekday
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

export interface CourtWorkingHourPayload {
  court: number
  weekday: Weekday
  opens_at?: string | null
  closes_at?: string | null
  is_closed: boolean
}
