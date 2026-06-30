export interface MobileBottomNavItem {
  key: string
  label: string
  marker: string
}

export interface MobileBottomNavProps {
  activeKey?: string
  items?: MobileBottomNavItem[]
  onChange?: (key: string) => void
}

const defaultStaffNavItems: MobileBottomNavItem[] = [
  { key: 'schedule', label: 'الجدول', marker: 'ج' },
  { key: 'bookings', label: 'الحجوزات', marker: 'ح' },
  { key: 'payments', label: 'المدفوعات', marker: 'د' },
  { key: 'more', label: 'المزيد', marker: 'م' },
]

/**
 * Mobile-only bottom navigation for operational staff screens.
 *
 * The markers are lightweight text placeholders so the app keeps one visual
 * style without adding an icon dependency during this UI extraction step. It
 * intentionally hides at tablet/desktop widths where a page toolbar has more
 * room for navigation and actions.
 */
export function MobileBottomNav({
  activeKey = 'schedule',
  items = defaultStaffNavItems,
  onChange,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="تنقل الموظف"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--sloty-border)] bg-[var(--sloty-surface)] shadow-[0_-8px_24px_rgb(17_24_39/6%)] md:hidden"
    >
      {items.map((item) => {
        const isActive = activeKey === item.key

        return (
          <button
            className={[
              'flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition',
              isActive
                ? 'text-[var(--sloty-primary)]'
                : 'text-[var(--sloty-text-muted)] hover:text-[var(--sloty-text-primary)]',
            ].join(' ')}
            key={item.key}
            onClick={() => onChange?.(item.key)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={[
                'flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black',
                isActive
                  ? 'bg-[var(--sloty-soft-mint)]'
                  : 'bg-[var(--sloty-bg)]',
              ].join(' ')}
            >
              {item.marker}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
