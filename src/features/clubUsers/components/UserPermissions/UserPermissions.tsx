import type { ClubUser } from '../../clubUsers.types'

const permissionLabels = [
  {
    key: 'can_change_pricing',
    label: 'تعديل أسعار الملاعب',
  },
  {
    key: 'can_manage_working_hours',
    label: 'إدارة مواعيد العمل',
  },
  {
    key: 'can_manage_settlements',
    label: 'إدارة التسويات المالية والجرد',
  },
] as const

function PermissionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
      <span aria-hidden="true">✓</span>
      {label}
    </span>
  )
}

/**
 * Business-facing permission summary for club users.
 */
export function UserPermissions({ user }: { user: ClubUser }) {
  if (user.role === 'OWNER') {
    return (
      <p className="rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-sm font-black text-[var(--sloty-primary-dark)]">
        صلاحيات كاملة كمالك
      </p>
    )
  }

  if (user.role === 'STAFF') {
    return (
      <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
        موظف تشغيل
      </p>
    )
  }

  const enabledPermissions = permissionLabels.filter((permission) =>
    Boolean(user[permission.key]),
  )

  return (
    <div className="space-y-2">
      <p className="text-sm font-black text-[var(--sloty-text-primary)]">
        الصلاحيات
      </p>
      {enabledPermissions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {enabledPermissions.map((permission) => (
            <PermissionBadge key={permission.key} label={permission.label} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--sloty-bg)] px-3 py-2 text-sm font-bold text-[var(--sloty-text-muted)]">
          لا توجد صلاحيات إضافية
        </p>
      )}
    </div>
  )
}
