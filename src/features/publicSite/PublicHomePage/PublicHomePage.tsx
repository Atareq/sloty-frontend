import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  HandCoins,
  LogIn,
  MapPin,
  QrCode,
  Repeat,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { getAppButtonClassName } from '../../../shared/components/AppButton/appButtonStyles'
import {
  PublicSiteIcon,
  PublicSiteLayout,
  PublicSiteSection,
} from '../components/PublicSiteLayout'
import {
  homePageCopy,
  publicSiteIdentityCopy,
  publicSiteNavCopy,
} from '../publicSite.copy'
import { ASSIUT_PATH } from '../publicSite.seo'

type AudienceKey = (typeof homePageCopy.audiences)[number]['key']
type FeatureKey = (typeof homePageCopy.features)[number]['key']

const audienceIcons: Record<AudienceKey, ReactNode> = {
  players: <Users className="h-5 w-5" />,
  owners: <Building2 className="h-5 w-5" />,
  staff: <UserCog className="h-5 w-5" />,
}

const featureIcons: Record<FeatureKey, ReactNode> = {
  schedule: <CalendarDays className="h-5 w-5" />,
  deposit: <HandCoins className="h-5 w-5" />,
  recurring: <Repeat className="h-5 w-5" />,
  payments: <Wallet className="h-5 w-5" />,
  workingHours: <Clock className="h-5 w-5" />,
  publicSchedule: <QrCode className="h-5 w-5" />,
}

/**
 * Public Sloty homepage at `/` for visitors without a session.
 *
 * Explains what Sloty is (booking and managing football pitches, starting
 * with Assiut) with crawlable content and real internal links. Signed-in users
 * and installed-PWA launches never see it; `HomeRoute` sends them to the
 * role-aware workspace redirect.
 */
export function PublicHomePage() {
  return (
    <PublicSiteLayout
      subtitle={homePageCopy.subtitle}
      title={homePageCopy.heading}
    >
      <AppCard className="space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-black text-[var(--sloty-text-primary)] sm:text-xl">
          {homePageCopy.introTitle}
        </h2>
        <p className="max-w-3xl text-base leading-8 text-[var(--sloty-text-primary)]">
          {publicSiteIdentityCopy.statement}
        </p>
        <p
          className="max-w-3xl text-left text-sm leading-6 text-[var(--sloty-text-muted)]"
          dir="ltr"
          lang="en"
        >
          {publicSiteIdentityCopy.english}
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Link
            className={getAppButtonClassName({ className: 'gap-2' })}
            to={ASSIUT_PATH}
          >
            <MapPin aria-hidden="true" className="h-5 w-5 shrink-0" />
            {publicSiteNavCopy.assiut}
          </Link>
          <Link
            className={getAppButtonClassName({
              variant: 'secondary',
              className: 'gap-2',
            })}
            rel="nofollow"
            to="/login"
          >
            <LogIn aria-hidden="true" className="h-5 w-5 shrink-0" />
            {publicSiteNavCopy.staffLogin}
          </Link>
        </div>
      </AppCard>

      <PublicSiteSection id="home-audiences" title={homePageCopy.audiencesTitle}>
        <ul className="grid gap-4 md:grid-cols-3">
          {homePageCopy.audiences.map((audience) => (
            <li key={audience.key}>
              <AppCard className="flex h-full gap-3">
                <PublicSiteIcon>{audienceIcons[audience.key]}</PublicSiteIcon>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[var(--sloty-text-primary)]">
                    {audience.title}
                  </h3>
                  <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
                    {audience.body}
                  </p>
                </div>
              </AppCard>
            </li>
          ))}
        </ul>
      </PublicSiteSection>

      <PublicSiteSection id="home-features" title={homePageCopy.featuresTitle}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {homePageCopy.features.map((feature) => (
            <li key={feature.key}>
              <AppCard className="flex h-full gap-3">
                <PublicSiteIcon>{featureIcons[feature.key]}</PublicSiteIcon>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--sloty-text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
                    {feature.body}
                  </p>
                </div>
              </AppCard>
            </li>
          ))}
        </ul>
      </PublicSiteSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppCard aria-labelledby="home-assiut" className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <PublicSiteIcon>
              <MapPin className="h-5 w-5" />
            </PublicSiteIcon>
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
              id="home-assiut"
            >
              {homePageCopy.assiutTitle}
            </h2>
          </div>
          <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
            {homePageCopy.assiutBody}
          </p>
          <Link
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--sloty-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
            to={ASSIUT_PATH}
          >
            {publicSiteNavCopy.assiut}
            <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
        </AppCard>

        <AppCard aria-labelledby="home-staff" className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <PublicSiteIcon>
              <CalendarClock className="h-5 w-5" />
            </PublicSiteIcon>
            <h2
              className="text-lg font-black text-[var(--sloty-text-primary)]"
              id="home-staff"
            >
              {homePageCopy.staffTitle}
            </h2>
          </div>
          <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
            {homePageCopy.staffBody}
          </p>
          <Link
            className={getAppButtonClassName({
              variant: 'secondary',
              className: 'gap-2',
            })}
            rel="nofollow"
            to="/login"
          >
            <LogIn aria-hidden="true" className="h-5 w-5 shrink-0" />
            {publicSiteNavCopy.staffLogin}
          </Link>
        </AppCard>
      </div>
    </PublicSiteLayout>
  )
}
