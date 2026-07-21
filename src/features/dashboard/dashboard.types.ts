export type PaymentMethod =
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'OTHER'

export type SettlementStatus = 'settled' | 'unsettled'

export interface DashboardSummaryQuery {
  date?: string
  date_from?: string
  date_to?: string
  court?: number | string
  collected_by?: number | string
  payment_method?: PaymentMethod | ''
  settlement_status?: SettlementStatus | ''
}

export interface DashboardSummaryResponse {
  context: {
    club_id: number
    club_name: string
    date_from: string
    date_to: string
    court?: number | null
    court_name?: string | null
    collected_by?: number | null
    collected_by_name?: string | null
    payment_method?: PaymentMethod | null
    settlement_status?: SettlementStatus | null
  }

  summary: {
    total_bookings: number
    hold_bookings: number
    confirmed_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    no_show_bookings: number
    expired_bookings: number

    total_booking_value: string | null
    total_paid_amount: string | null
    total_remaining_amount: string | null

    transaction_count: number | null
    transaction_total: string | null

    unsettled_transaction_count: number | null
    unsettled_transaction_amount: string | null

    settled_transaction_count: number | null
    settled_transaction_amount: string | null

    staff_with_unsettled_transactions_count: number
    needs_action_count: number
  }

  needs_action_breakdown: {
    hold_waiting_payment_count: number
    overdue_confirmed_count: number
    remaining_after_slot_end_count: number
    expiring_hold_count: number
  }

  payment_method_totals: Partial<
    Record<
      PaymentMethod,
      {
        amount: string
        count: number
      }
    >
  >

  staff_unsettled_money: Array<{
    collected_by: number
    collected_by_name: string
    court?: number | null
    court_name?: string | null
    total_unsettled_amount: string
    unsettled_transaction_count: number
    totals_by_payment_method: Partial<Record<PaymentMethod, string>>
  }>
}

export type DashboardResponse = DashboardSummaryResponse

export interface DashboardActivityActor {
  id: number
  name: string
}

export interface DashboardActivityCourt {
  id: number
  name: string
}

export interface DashboardActivity {
  id: number
  action: string
  action_label?: string
  message: string
  created?: string
  actor?: DashboardActivityActor | null
  court?: DashboardActivityCourt | null
  entity_type?: string | null
  entity_id?: number | string | null
}
