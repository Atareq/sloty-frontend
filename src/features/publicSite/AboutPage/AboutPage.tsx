import { useState, type ReactNode } from 'react'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { getAppButtonClassName } from '../../../shared/components/AppButton/appButtonStyles'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { slotyContactLinks } from '../../../shared/config/contact'
import { PublicSiteLayout } from '../components/PublicSiteLayout'
import { aboutPageCopy } from '../publicSite.copy'
import { PUBLIC_HOME_PATH } from '../publicSite.seo'

const breadcrumbs = [
  { label: 'Sloty', to: PUBLIC_HOME_PATH },
  { label: aboutPageCopy.breadcrumbCurrent },
] as const

/** Decorative emoji: the adjacent text always carries the meaning. */
function Emoji({ children }: { children: string }) {
  return <span aria-hidden="true">{children}</span>
}

/** One calm About section: an H2 and short content, no card or icon. */
function AboutSection({
  id,
  title,
  children,
}: {
  id: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2
        className="text-xl font-black text-[var(--sloty-text-primary)] sm:text-2xl"
        id={id}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const bodyClassName =
  'text-base leading-8 text-[var(--sloty-text-muted)] sm:text-lg sm:leading-9'

/**
 * Brand page at `/about/`, intentionally minimal: a short hero, one sentence
 * per section, and a single primary CTA («ابدأ مجانًا») at the bottom.
 *
 * The CTA opens a tiny `AppSheet` with two semantic contact links (`tel:` /
 * `mailto:`) from the shared `slotyContact` config; there is no form. The page
 * lists no Courts and calls no API. SEO is owned by the route, not this page.
 */
export function AboutPage() {
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false)

  return (
    <PublicSiteLayout breadcrumbs={breadcrumbs} title={aboutPageCopy.heading}>
      <div className="mx-auto w-full max-w-2xl space-y-14 py-4 text-center sm:space-y-20 sm:py-10">
        <section aria-labelledby="about-hero" className="space-y-4">
          <h2
            className="text-4xl font-black leading-tight text-[var(--sloty-text-primary)] sm:text-5xl"
            id="about-hero"
          >
            {aboutPageCopy.heroTitle} <Emoji>{aboutPageCopy.heroTitleEmoji}</Emoji>
          </h2>
          <p className="text-lg font-bold leading-8 text-[var(--sloty-text-primary)] sm:text-xl sm:leading-9">
            {aboutPageCopy.heroLead}
          </p>
          <p className={bodyClassName}>
            {aboutPageCopy.heroOrigin} <Emoji>{aboutPageCopy.heroOriginEmoji}</Emoji>
          </p>
        </section>

        <AboutSection id="about-who" title={aboutPageCopy.whoTitle}>
          <p className={bodyClassName}>{aboutPageCopy.whoBody}</p>
        </AboutSection>

        <AboutSection id="about-why" title={aboutPageCopy.whyTitle}>
          <p className={bodyClassName}>{aboutPageCopy.whyBody}</p>
        </AboutSection>

        <AboutSection id="about-audiences" title={aboutPageCopy.audiencesTitle}>
          <ul className="space-y-3">
            {aboutPageCopy.audiences.map((audience) => (
              <li
                className="text-lg font-bold text-[var(--sloty-text-primary)] sm:text-xl"
                key={audience.key}
              >
                <Emoji>{audience.emoji}</Emoji> {audience.label}
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection id="about-goal" title={aboutPageCopy.goalTitle}>
          <p className="text-2xl font-black leading-10 text-[var(--sloty-primary-dark)] sm:text-3xl sm:leading-[3rem]">
            {aboutPageCopy.goalStatement}
          </p>
        </AboutSection>

        <AboutSection
          id="about-free"
          title={
            <>
              {aboutPageCopy.freeTitle} <Emoji>{aboutPageCopy.freeTitleEmoji}</Emoji>
            </>
          }
        >
          <p className={bodyClassName}>{aboutPageCopy.freeBody}</p>
        </AboutSection>

        <AboutSection id="about-cta" title={aboutPageCopy.ctaTitle}>
          <div className="pt-2">
            <AppButton
              className="min-h-12 w-full px-8 text-base sm:w-auto sm:min-w-56"
              onClick={() => setIsContactSheetOpen(true)}
            >
              {aboutPageCopy.ctaAction}
            </AppButton>
          </div>
        </AboutSection>
      </div>

      <AppSheet
        isOpen={isContactSheetOpen}
        onRequestClose={() => setIsContactSheetOpen(false)}
        title={aboutPageCopy.contactSheetTitle}
      >
        <div className="space-y-4 p-5" dir="rtl">
          <p className="text-base font-bold text-[var(--sloty-text-primary)]">
            {aboutPageCopy.contactSheetBody}
          </p>
          <div className="flex flex-col gap-3">
            <a
              className={getAppButtonClassName({
                variant: 'secondary',
                fullWidth: true,
                className: 'min-h-12 gap-2 text-base',
              })}
              href={slotyContactLinks.phone}
            >
              <Emoji>{aboutPageCopy.callActionEmoji}</Emoji>
              {aboutPageCopy.callAction}
            </a>
            <a
              className={getAppButtonClassName({
                variant: 'secondary',
                fullWidth: true,
                className: 'min-h-12 gap-2 text-base',
              })}
              href={slotyContactLinks.email}
            >
              <Emoji>{aboutPageCopy.emailActionEmoji}</Emoji>
              {aboutPageCopy.emailAction}
            </a>
          </div>
        </div>
      </AppSheet>
    </PublicSiteLayout>
  )
}
