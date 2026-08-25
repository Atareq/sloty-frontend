export const COURT_USAGE_REPORT_STATUSES = [
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
] as const

export const REPORT_DATE_RANGE_INVALID = 'REPORT_DATE_RANGE_INVALID'
export const REPORT_DATE_RANGE_TOO_LARGE = 'REPORT_DATE_RANGE_TOO_LARGE'
export const CUSTOM_REPORT_HOURS_REQUIRED = 'CUSTOM_REPORT_HOURS_REQUIRED'
export const INVALID_CUSTOM_REPORT_HOURS = 'INVALID_CUSTOM_REPORT_HOURS'
export const REPORT_STAFF_NOT_IN_CLUB = 'REPORT_STAFF_NOT_IN_CLUB'
export const INVALID_COURT_USAGE_STATUS = 'INVALID_COURT_USAGE_STATUS'

export type CourtUsageReportPeriod =
  | 'all_day'
  | 'daytime'
  | 'evening'
  | 'custom'

export type CourtUsageReportStatus =
  (typeof COURT_USAGE_REPORT_STATUSES)[number]

export type CourtUsageReportErrorCode =
  | typeof REPORT_DATE_RANGE_INVALID
  | typeof REPORT_DATE_RANGE_TOO_LARGE
  | typeof CUSTOM_REPORT_HOURS_REQUIRED
  | typeof INVALID_CUSTOM_REPORT_HOURS
  | typeof REPORT_STAFF_NOT_IN_CLUB
  | typeof INVALID_COURT_USAGE_STATUS

export interface CourtUsageReportQueryParams {
  date_from: string
  date_to: string
  court?: number | string
  period?: CourtUsageReportPeriod
  hour_from?: string
  hour_to?: string
  staff?: number | string
  status?: CourtUsageReportStatus | ''
}

export interface FinancialTotals {
  total_booking_value: string
  total_paid_amount: string
  total_remaining_amount: string
}

export interface UsageMetrics {
  booking_count: number
  occupied_minutes: number
  available_minutes: number
  utilization_percentage: string
}

export interface CourtUsageContext {
  club_id: number
  club_name: string
  date_from: string
  date_to: string
  court: number | null
  court_name: string | null
  period: CourtUsageReportPeriod
  hour_from: string | null
  hour_to: string | null
  staff: number | null
  staff_name: string | null
  status: CourtUsageReportStatus | null
  included_statuses: CourtUsageReportStatus[]
  demand_bucket_minutes: number
}

export interface CourtUsageByCourt extends UsageMetrics {
  court: number
  court_name: string
  status_counts: Record<string, number>
  financial: FinancialTotals
}

export interface CourtUsageByDay extends UsageMetrics {
  date: string
  financial: FinancialTotals
}

export interface CourtUsageByPeriod extends UsageMetrics {
  period: CourtUsageReportPeriod
  hour_from: string | null
  hour_to: string | null
}

export interface DemandHour extends UsageMetrics {
  hour_from: string
  hour_to: string
}

export interface StaffBookingActivity {
  staff: number
  staff_name: string
  booking_count: number
  status_counts: Record<string, number>
  occupied_minutes: number
  financial: FinancialTotals
}

export interface CourtUsageReport {
  context: CourtUsageContext
  summary: UsageMetrics & {
    status_counts: Record<string, number>
    financial: FinancialTotals
  }
  usage_by_court: CourtUsageByCourt[]
  usage_by_day: CourtUsageByDay[]
  usage_by_period: CourtUsageByPeriod[]
  peak_hours: DemandHour[]
  low_demand_hours: DemandHour[]
  staff_booking_activity: StaffBookingActivity[]
}
