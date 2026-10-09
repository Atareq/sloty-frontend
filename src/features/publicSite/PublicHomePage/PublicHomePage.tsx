import { ArrowLeft, Info } from 'lucide-react'
import { Link } from 'react-router'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { DiscoveryCourtList } from '../../publicDiscovery/components/DiscoveryCourtList'
import {
  PublicSiteIcon,
  PublicSiteLayout,
  PublicSiteSection,
} from '../components/PublicSiteLayout'
import { homePageCopy, publicSiteNavCopy } from '../publicSite.copy'
import { ABOUT_PATH } from '../publicSite.seo'

const COURTS_HEADING_ID = 'home-courts'

/**
 * Public player discovery at `/` for visitors without a session.
 *
 * The primary SEO and product surface: a short Sloty identity line, then the
 * real football Courts from the public discovery API. Each Court
 * links to its existing guest Public Schedule. Brand and owner content lives
 * on `/about/`. Signed-in users and installed-PWA launches never see this
 * page; `HomeRoute` sends them to the role-aware workspace redirect.
 */
export function PublicHomePage() {
  return (
    <PublicSiteLayout
      subtitle={homePageCopy.subtitle}
      title={homePageCopy.heading}
    >
      <p className="max-w-3xl text-base leading-8 text-[var(--sloty-text-primary)]">
        {homePageCopy.intro}
      </p>

      <PublicSiteSection id={COURTS_HEADING_ID} title={homePageCopy.courtsTitle}>
        <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
          {homePageCopy.courtsHint}
        </p>
        <DiscoveryCourtList
          labelledBy={COURTS_HEADING_ID}
        />
      </PublicSiteSection>

      <AppCard aria-labelledby="home-about" className="space-y-3 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <PublicSiteIcon>
            <Info className="h-5 w-5" />
          </PublicSiteIcon>
          <h2
            className="text-lg font-black text-[var(--sloty-text-primary)]"
            id="home-about"
          >
            {homePageCopy.aboutTitle}
          </h2>
        </div>
        <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
          {homePageCopy.aboutBody}
        </p>
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--sloty-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
          to={ABOUT_PATH}
        >
          {publicSiteNavCopy.about}
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
      </AppCard>
    </PublicSiteLayout>
  )
}
