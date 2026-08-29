import { AppCard } from '../../../shared/components/AppCard/AppCard'

export interface PlaceholderPageProps {
  title: string
  description: string
}

/**
 * Authenticated placeholder for unfinished Platform Admin Settings.
 *
 * Keep this until `/admin/settings` has a real screen. Do not reuse it for
 * obsolete bottom-nav routes such as `/more`.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <AppCard>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          {title}: {description} سيتم بناء الوظائف الحقيقية بعد
          اعتماد واجهات الخلفية وتدفقات المنتج الخاصة بها.
        </p>
      </AppCard>
    </div>
  )
}
