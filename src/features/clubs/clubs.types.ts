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
}

/**
 * The Club detail endpoint supports PATCH, so callers that edit one
 * Club-owned setting do not need to resend unrelated setup fields.
 */
export type ClubUpdatePayload = Partial<Omit<ClubPayload, 'slug'>>
