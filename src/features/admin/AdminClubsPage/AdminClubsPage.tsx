import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

/**
 * Minimal platform-admin placeholder route.
 *
 * The auth foundation needs a landing path for `PLATFORM_ADMIN`, but the
 * actual clubs management screen is intentionally out of scope for this task.
 */
export function AdminClubsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        description="صفحة مؤقتة لمسار مسؤول المنصة حتى يتم بناء شاشة الأندية لاحقاً."
        title="إدارة الأندية"
        tone="brand"
      />

      <AppCard>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          سيتم بناء إدارة الأندية بعد اعتماد تدفق الإنشاء والتعديل والصلاحيات
          مع الخلفية.
        </p>
      </AppCard>
    </div>
  )
}
