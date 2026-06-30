/**
 * Minimal platform-admin placeholder route.
 *
 * The auth foundation needs a landing path for `platform_super_admin`, but the
 * actual clubs management screen is intentionally out of scope for this task.
 */
export function AdminClubsPage() {
  return (
    <div className="rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-5 shadow-[var(--sloty-shadow)]">
      <h1 className="text-xl font-black text-[var(--sloty-text-primary)]">
        إدارة الأندية
      </h1>
      <p className="mt-2 text-sm text-[var(--sloty-text-muted)]">
        صفحة مؤقتة لمسار مسؤول المنصة حتى يتم بناء شاشة الأندية لاحقاً.
      </p>
    </div>
  )
}
