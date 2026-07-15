export interface AuditQueryParams {
  date_from?: string
  date_to?: string
  actor?: number | string
  action?: string
  page?: number | string
}

export interface AuditActor {
  id: number
  name: string
}

export type AuditMetadataValue = string | number | boolean | null

export interface AuditLogEntry {
  id: number
  action: string
  actor?: AuditActor | null
  target_type?: string | null
  target_id?: number | string | null
  message?: string
  metadata?: Record<string, AuditMetadataValue> | null
  created?: string
}
