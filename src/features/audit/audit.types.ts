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
  club?: number
  action: string
  action_label?: string | null
  entity_type?: string | null
  entity_id?: number | string | null
  actor?: AuditActor | number | null
  actor_name?: string | null
  actor_name_source?:
    | 'EVENT_SNAPSHOT'
    | 'EXISTING_EVENT_DATA'
    | 'CURRENT_RELATION_FALLBACK'
    | 'UNAVAILABLE'
    | string
    | null
  court?: number | null
  court_name?: string | null
  court_name_source?:
    | 'EVENT_SNAPSHOT'
    | 'EXISTING_EVENT_DATA'
    | 'CURRENT_RELATION_FALLBACK'
    | 'UNAVAILABLE'
    | string
    | null
  target_type?: string | null
  target_id?: number | string | null
  message?: string
  description?: string | null
  summary?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  created?: string
}

export type AuditLogDetail = AuditLogEntry
