import type { Settlement, SettlementActor } from './settlements.types'

/** Formats a returned user snapshot without exposing backend identifiers. */
export function formatSettlementActor(
  actor: number | SettlementActor | null | undefined,
): string {
  if (actor && typeof actor === 'object' && actor.name?.trim()) {
    return actor.name.trim()
  }

  return 'غير متاح'
}

/** Historical response names are authoritative; missing snapshots stay calm. */
export function getSettlementCollectorName(settlement: Settlement): string {
  return settlement.collected_by_name?.trim() || 'موظف سابق'
}
