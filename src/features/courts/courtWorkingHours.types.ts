export type CourtWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface CourtWorkingHourBlock {
  id?: number
  start_time: string
  end_time: string
}

export interface CourtWorkingHourBlockPayload {
  start_time: string
  end_time: string
}

export interface CourtWorkingHour {
  id?: number
  weekday: CourtWeekday
  is_closed: boolean
  blocks: CourtWorkingHourBlock[]
}

export interface CourtWorkingHourApiRecord {
  id?: number
  weekday: CourtWeekday
  is_closed?: boolean
  blocks?: CourtWorkingHourBlock[]
  opens_at?: string | null
  closes_at?: string | null
}

export interface CourtWorkingHourPayload {
  weekday: CourtWeekday
  is_closed: boolean
  blocks: CourtWorkingHourBlockPayload[]
}

export interface CourtWorkingHoursResponse {
  court: number
  court_name: string
  working_hours: CourtWorkingHour[]
}

export interface CourtWorkingHoursApiResponse {
  court: number
  court_name: string
  working_hours?: CourtWorkingHourApiRecord[]
}

export interface CourtWorkingHoursPutPayload {
  working_hours: CourtWorkingHourPayload[]
}
