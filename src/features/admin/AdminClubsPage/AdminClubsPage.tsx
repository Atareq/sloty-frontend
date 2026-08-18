import { AppCard } from '../../../shared/components/AppCard/AppCard'

/**
 * Minimal platform-admin placeholder route.
 *
 * The auth foundation needs a landing path for `PLATFORM_ADMIN`, but the
 * actual clubs management screen is intentionally out of scope for this task.
 */
export function AdminClubsPage() {
  return (
    <div className="space-y-5">
      <AppCard>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          سيتم بناء إدارة الأندية بعد اعتماد تدفق الإنشاء والتعديل والصلاحيات
          مع الخلفية.
        </p>
      </AppCard>
    </div>
  )
}
