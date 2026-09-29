import { ArrowLeft, Building2, Check, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import {
  PublicSiteIcon,
  PublicSiteLayout,
  PublicSiteSection,
} from '../components/PublicSiteLayout'
import { assiutPageCopy } from '../publicSite.copy'
import { PUBLIC_HOME_PATH } from '../publicSite.seo'

const breadcrumbs = [
  { label: 'Sloty', to: PUBLIC_HOME_PATH },
  { label: assiutPageCopy.breadcrumbCurrent },
] as const

/**
 * Public Assiut landing page at `/assiut/`.
 *
 * Explains football pitch booking and management with Sloty in Assiut for
 * players, owners, and staff. It lists no clubs, courts, or availability:
 * there is no public Backend listing yet, and the page must never show
 * invented venues or times.
 */
export function AssiutPage() {
  return (
    <PublicSiteLayout
      breadcrumbs={breadcrumbs}
      subtitle={assiutPageCopy.subtitle}
      title={assiutPageCopy.heading}
    >
      <AppCard className="space-y-3 p-5 sm:p-6">
        <p className="max-w-3xl text-base leading-8 text-[var(--sloty-text-primary)]">
          {assiutPageCopy.intro}
        </p>
        <p
          className="text-left text-sm leading-6 text-[var(--sloty-text-muted)]"
          dir="ltr"
          lang="en"
        >
          {assiutPageCopy.englishSummary}
        </p>
      </AppCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppCard className="space-y-4 p-5 sm:p-6">
          <PublicSiteSection id="assiut-players" title={assiutPageCopy.playersTitle}>
            <ol className="space-y-3">
              {assiutPageCopy.playersSteps.map((step, index) => (
                <li className="flex items-start gap-3" key={step}>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sloty-soft-mint)] text-sm font-black text-[var(--sloty-primary)]"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-[var(--sloty-text-primary)]">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </PublicSiteSection>
          <p className="flex items-start gap-2 rounded-2xl bg-[var(--sloty-bg)] p-3 text-sm leading-7 text-[var(--sloty-text-muted)]">
            <ShieldCheck
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-[var(--sloty-primary)]"
            />
            {assiutPageCopy.playersPrivacy}
          </p>
        </AppCard>

        <AppCard className="space-y-4 p-5 sm:p-6">
          <PublicSiteSection id="assiut-owners" title={assiutPageCopy.ownersTitle}>
            <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
              {assiutPageCopy.ownersBody}
            </p>
            <ul className="space-y-2">
              {assiutPageCopy.ownersPoints.map((point) => (
                <li
                  className="flex items-start gap-2 text-sm leading-7 text-[var(--sloty-text-primary)]"
                  key={point}
                >
                  <Check
                    aria-hidden="true"
                    className="mt-1 h-5 w-5 shrink-0 text-[var(--sloty-primary)]"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </PublicSiteSection>
        </AppCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppCard aria-labelledby="assiut-find-court" className="flex gap-3 p-5 sm:p-6">
          <PublicSiteIcon>
            <Users className="h-5 w-5" />
          </PublicSiteIcon>
          <div className="space-y-1">
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
              id="assiut-find-court"
            >
              {assiutPageCopy.findCourtTitle}
            </h2>
            <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
              {assiutPageCopy.findCourtBody}
            </p>
          </div>
        </AppCard>

        <AppCard aria-labelledby="assiut-about" className="flex gap-3 p-5 sm:p-6">
          <PublicSiteIcon>
            <Building2 className="h-5 w-5" />
          </PublicSiteIcon>
          <div className="space-y-1">
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
              id="assiut-about"
            >
              {assiutPageCopy.aboutTitle}
            </h2>
            <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
              {assiutPageCopy.aboutBody}
            </p>
            <Link
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--sloty-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
              to={PUBLIC_HOME_PATH}
            >
              {assiutPageCopy.aboutLink}
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </AppCard>
      </div>
    </PublicSiteLayout>
  )
}
