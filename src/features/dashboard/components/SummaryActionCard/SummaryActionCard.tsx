import { Link } from 'react-router'

export interface SummaryActionCardProps {
  label: string
  value: string | number | null | undefined
  helper?: string
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'
  to?: string
  isLoading?: boolean
}

const toneClasses: Record<NonNullable<SummaryActionCardProps['tone']>, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-sky-200 bg-sky-50 text-sky-800',
  gray: 'border-slate-200 bg-slate-50 text-slate-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  purple: 'border-violet-200 bg-violet-50 text-violet-800',
  red: 'border-red-200 bg-red-50 text-red-800',
}

function CardBody({
  helper,
  isClickable,
  isLoading,
  label,
  tone = 'green',
  value,
}: SummaryActionCardProps & { isClickable: boolean }) {
  return (
    <div
      className={`h-full rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] transition ${
        isClickable ? 'cursor-pointer hover:border-[var(--sloty-primary)]' : ''
      }`}
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-full bg-[var(--sloty-bg)]" />
          <div className="h-8 w-20 rounded-full bg-[var(--sloty-bg)]" />
          <div className="h-4 w-32 rounded-full bg-[var(--sloty-bg)]" />
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black text-[var(--sloty-text-primary)]">
              {label}
            </p>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses[tone]}`}
            >
              {isClickable ? 'عرض التفاصيل' : 'ملخص'}
            </span>
          </div>

          <p className="text-2xl font-black text-[var(--sloty-primary-dark)]">
            {value ?? '-'}
          </p>

          {helper ? (
            <p className="text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              {helper}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function SummaryActionCard(props: SummaryActionCardProps) {
  if (props.to) {
    return (
      <Link className="block h-full" to={props.to}>
        <CardBody {...props} isClickable />
      </Link>
    )
  }

  return <CardBody {...props} isClickable={false} />
}
