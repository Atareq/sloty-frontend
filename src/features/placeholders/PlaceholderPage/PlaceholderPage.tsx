import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

export interface PlaceholderPageProps {
  title: string
  description: string
}

/**
 * Lightweight authenticated placeholder for routes whose real screens are not
 * in scope yet. It avoids mock business data while keeping navigation usable.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <PageHeader description={description} tone="brand" title={title} />

      <AppCard>
        <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
          هذه صفحة مؤقتة داخل هيكل التطبيق. سيتم بناء الوظائف الحقيقية بعد
          اعتماد واجهات الخلفية وتدفقات المنتج الخاصة بها.
        </p>
      </AppCard>
    </div>
  )
}
