export interface Club {
  id: number
  name: string
  slug: string
  city: string
  area: string
  address?: string
  phone_number?: string
  notes?: string
  is_active: boolean
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
  created?: string
  modified?: string
}

export interface ClubPayload {
  name: string
  slug?: string
  city: string
  area: string
  address?: string
  phone_number?: string
  notes?: string
  is_active?: boolean
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}
