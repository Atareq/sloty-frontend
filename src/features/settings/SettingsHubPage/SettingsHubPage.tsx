import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { navigationCopy } from '../../../shared/copy/appCopy'
import { ChangePasswordSheet } from '../components/ChangePasswordSheet/ChangePasswordSheet'

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
        <h2 className="text-lg font-extrabold text-[var(--sloty-text-primary)]">
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
 * Settings hub for club administration and authenticated account security.
 */
export function SettingsHubPage() {
  const { role } = useAuth()
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const canViewOwnerLinks = role === 'OWNER'

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SettingsLinkCard
          actionLabel="فتح إعدادات الملاعب"
          description="إدارة بيانات الملاعب ومواعيد العمل والأسعار."
          title={navigationCopy.courtSettings}
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
            actionLabel="عرض سجل النشاط"
            description="متابعة الإجراءات والتعديلات داخل النادي."
            title="سجل النشاط"
            to="/audit-logs"
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--sloty-text-primary)]">
          الأمان والحساب
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AppCard className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--sloty-text-primary)]">
                تغيير كلمة المرور
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
                غيّر كلمة مرور حسابك للحفاظ على أمانه.
              </p>
            </div>
            <AppButton
              fullWidth
              onClick={() => setIsChangePasswordOpen(true)}
              variant="secondary"
            >
              تغيير كلمة المرور
            </AppButton>
          </AppCard>
        </div>
      </section>

      <ChangePasswordSheet
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  )
}
