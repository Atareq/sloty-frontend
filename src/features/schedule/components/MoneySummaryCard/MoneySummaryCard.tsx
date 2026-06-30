export interface MoneySummaryCardProps {
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'warning' | 'danger'
  suffix?: string
}

const toneClasses: Record<Required<MoneySummaryCardProps>['tone'], string> = {
  default: 'text-[var(--sloty-text-primary)]',
  success: 'text-[var(--sloty-primary)]',
  warning: 'text-[var(--sloty-hold)]',
  danger: 'text-[var(--sloty-danger)]',
}

/**
 * Compact summary cell for the staff schedule header.
 *
 * It presents one operational number only. Calculations stay in the feature
 * screen or service layer, not inside this visual component.
 */
export function MoneySummaryCard({
  label,
  value,
  tone = 'default',
  suffix,
}: MoneySummaryCardProps) {
  return (
    <div className="min-w-0 flex-1 px-2 py-2.5 text-center">
      <p
        className={[
          'truncate text-lg font-black leading-none',
          toneClasses[tone],
        ].join(' ')}
      >
        {value}
        {suffix ? (
          <span className="mr-0.5 text-[11px] font-bold">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-1 truncate text-[11px] text-[var(--sloty-text-muted)]">
        {label}
      </p>
    </div>
  )
}
