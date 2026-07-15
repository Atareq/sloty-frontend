export interface DashboardQueryParams {
  date_from?: string
  date_to?: string
}

export interface DashboardBookingsSummary {
  today?: number
  week?: number
  confirmed?: number
  completed?: number
  cancelled?: number
  no_show?: number
}

export interface DashboardPaymentsSummary {
  paid_amount?: string
  remaining_amount?: string
  cancelled_amount?: string
}

export interface DashboardSettlementsSummary {
  unsettled_amount?: string
  settled_amount?: string
}

export interface DashboardCourtSummary {
  id: number
  name: string
  bookings_count?: number
  revenue?: string
  paid_amount?: string
}

export interface DashboardActivityActor {
  id: number
  name: string
}

export interface DashboardActivity {
  id: number
  action?: string
  message: string
  created?: string
  actor?: DashboardActivityActor | null
}

export interface DashboardSummary {
  date_from?: string | null
  date_to?: string | null
  bookings?: DashboardBookingsSummary
  payments?: DashboardPaymentsSummary
  settlements?: DashboardSettlementsSummary
  courts?: DashboardCourtSummary[]
  recent_activity?: DashboardActivity[]
}
