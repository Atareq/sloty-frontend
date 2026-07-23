import { Link } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'

interface SettingsLinkCardProps {
  title: string
  description: string
  actionLabel: string
  to: string
}

function SettingsLinkCard({
  actionLabel,
  description,
  title,
  to,
}: SettingsLinkCardProps) {
  return (
    <AppCard className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
          {title}
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
          {description}
        </p>
      </div>
      <Link to={to}>
        <AppButton fullWidth variant="secondary">
          {actionLabel}
        </AppButton>
      </Link>
    </AppCard>
  )
}

/**
 * Owner-facing settings hub for club administration links.
 */
export function SettingsHubPage() {
  const { role } = useAuth()
  const canViewOwnerLinks = role === 'OWNER'

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SettingsLinkCard
          actionLabel="إعدادات الملاعب"
          description="إدارة بيانات الملاعب ومواعيد العمل والأسعار."
          title="إدارة الملاعب"
          to="/settings/courts"
        />

        {canViewOwnerLinks ? (
          <SettingsLinkCard
            actionLabel="فتح المستخدمين والصلاحيات"
            description="مراجعة أعضاء النادي وصلاحيات المديرين."
            title="المستخدمون والصلاحيات"
            to="/settings/users"
          />
        ) : null}

        {canViewOwnerLinks ? (
          <SettingsLinkCard
            actionLabel="عرض سجل النشاطات"
            description="متابعة الإجراءات والتعديلات داخل النادي."
            title="سجل النشاطات"
            to="/audit-logs"
          />
        ) : null}
      </section>
    </div>
  )
}
