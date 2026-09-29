import type { ReactNode } from 'react'
import { ChevronLeft, LogIn } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { RouteScrollReset } from '../../../layout/RouteScrollReset'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { publicSiteIdentityCopy, publicSiteNavCopy } from '../publicSite.copy'
import { ASSIUT_PATH, PUBLIC_HOME_PATH } from '../publicSite.seo'

export interface PublicBreadcrumb {
  label: string
  /** Omit for the current page. */
  to?: string
}

export interface PublicSiteLayoutProps {
  /** Page H1, rendered by the shared `PageHeader`. */
  title: string
  subtitle: string
  breadcrumbs?: readonly PublicBreadcrumb[]
  children: ReactNode
}

const footerLinkClassName =
  'inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-bold text-[var(--sloty-text-primary)] underline-offset-4 transition hover:text-[var(--sloty-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30 aria-[current=page]:text-[var(--sloty-primary)]'

/**
 * Staff login entry in the public header.
 *
 * Solid white so it stays readable on the green header and on the white
 * collapsed header bar. `rel="nofollow"`: login is not an SEO target.
 */
function PublicStaffLoginLink() {
  return (
    <Link
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-[var(--sloty-primary-dark)] shadow-sm transition hover:bg-[var(--sloty-soft-mint)] focus:outline-none focus:ring-2 focus:ring-white/70 sm:px-4"
      rel="nofollow"
      to="/login"
    >
      <LogIn aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>{publicSiteNavCopy.login}</span>
    </Link>
  )
}

function PublicBreadcrumbs({ items }: { items: readonly PublicBreadcrumb[] }) {
  return (
    <nav aria-label={publicSiteNavCopy.breadcrumbLabel}>
      <ol className="flex flex-wrap items-center gap-1 text-sm font-semibold text-[var(--sloty-text-muted)]">
        {items.map((item, index) => (
          <li className="flex items-center gap-1" key={item.label}>
            {index > 0 ? (
              <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
            ) : null}
            {item.to ? (
              <Link className={footerLinkClassName} to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="font-bold text-[var(--sloty-text-primary)]"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function PublicSiteFooter() {
  return (
    <footer className="border-t border-[var(--sloty-border)] bg-[var(--sloty-surface)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p className="text-base font-black text-[var(--sloty-text-primary)]">
            {publicSiteNavCopy.brand}
          </p>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {publicSiteIdentityCopy.footerTagline}
          </p>
        </div>
        <nav aria-label={publicSiteNavCopy.footerNavLabel}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <NavLink className={footerLinkClassName} end to={PUBLIC_HOME_PATH}>
                {publicSiteNavCopy.home}
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} to={ASSIUT_PATH}>
                {publicSiteNavCopy.assiut}
              </NavLink>
            </li>
            <li>
              <Link className={footerLinkClassName} rel="nofollow" to="/login">
                {publicSiteNavCopy.staffLogin}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}

/**
 * Shared frame for Sloty's public, indexable pages.
 *
 * Uses the canonical `PageHeader` (its title is the page H1) outside
 * `AppShell`, like the guest Public Schedule. The footer carries the real
 * internal links between public pages. Pages never touch the document head;
 * route SEO is owned by `SeoRouteBoundary`. Navigation between public pages
 * starts at the top via the canonical `RouteScrollReset`.
 */
export function PublicSiteLayout({
  title,
  subtitle,
  breadcrumbs,
  children,
}: PublicSiteLayoutProps) {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-svh flex-col bg-[var(--sloty-bg)]" dir="rtl">
      <RouteScrollReset />
      <PageHeader
        endAction={<PublicStaffLoginLink />}
        resetKey={pathname}
        showMenuButton={false}
        subtitle={subtitle}
        title={title}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        {breadcrumbs ? <PublicBreadcrumbs items={breadcrumbs} /> : null}
        {children}
      </main>
      <PublicSiteFooter />
    </div>
  )
}

export interface PublicSiteSectionProps {
  id: string
  title: string
  children: ReactNode
}

/** Titled content block (H2) used by public pages. */
export function PublicSiteSection({ id, title, children }: PublicSiteSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2
        className="text-lg font-black text-[var(--sloty-text-primary)] sm:text-xl"
        id={id}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Icon tile matching Sloty's soft-mint accent surfaces. */
export function PublicSiteIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary)]"
    >
      {children}
    </span>
  )
}
