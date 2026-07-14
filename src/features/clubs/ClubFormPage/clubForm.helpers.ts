import type { ClubPayload } from '../clubs.types'

export interface ClubFormState {
  name: string
  slug: string
  governorate: string
  city: string
  area: string
  address: string
  phone_number: string
  notes: string
  is_active: boolean
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
}

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

export function buildClubPayload(
  formState: ClubFormState,
  isCreateMode: boolean,
): ClubPayload {
  return {
    name: formState.name.trim(),
    ...(isCreateMode ? { slug: optionalText(formState.slug) } : {}),
    governorate: formState.governorate,
    city: formState.city.trim(),
    area: formState.area.trim(),
    address: optionalText(formState.address),
    phone_number: optionalText(formState.phone_number),
    notes: optionalText(formState.notes),
    is_active: formState.is_active,
    manager_can_settle_transactions:
      formState.manager_can_settle_transactions,
    manager_can_change_pricing: formState.manager_can_change_pricing,
  }
}
