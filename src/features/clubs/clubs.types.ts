export interface Club {
  id: number
  name: string
  slug: string
  governorate?: string
  city: string
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
  governorate: string
  city: string
  address?: string
  phone_number?: string
  notes?: string
  is_active?: boolean
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}
