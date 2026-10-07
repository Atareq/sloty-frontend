import { useState } from 'react'
import { ChevronLeft, ImageOff, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { buildPublicCourtSchedulePath } from '../../publicSchedule/publicSchedule.helpers'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'
import type { DiscoveryCourt } from '../publicDiscovery.types'

export interface DiscoveryCourtCardProps {
  court: DiscoveryCourt
  /** Optional Phase 6 searched date (`YYYY-MM-DD`) carried into Public Schedule. */
  handoffDate?: string | null
}

/**
 * One real Court on the public discovery page.
 *
 * Shows only the Backend image, Court name, and address. The whole card is
 * one link (the Court name) to the existing guest Public Schedule (including
 * `?date=YYYY-MM-DD` when a day filter is active in Phase 6). Without a
 * usable image it shows a neutral placeholder, never a substitute photo.
 *
 * Uses `AppCard`'s surface tokens on an `<article>` because the image is
 * full-bleed and `AppCard`'s built-in padding cannot be removed by className.
 */
export function DiscoveryCourtCard({
  court,
  handoffDate = null,
}: DiscoveryCourtCardProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const showImage = court.imageUrl !== null && !hasImageError
  const schedulePath = buildPublicCourtSchedulePath(
    court.clubSlug,
    court.courtId,
    handoffDate ? { date: handoffDate } : null,
  )

  return (
    <article
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] shadow-[var(--sloty-shadow)] transition hover:border-[var(--sloty-primary)] focus-within:ring-2 focus-within:ring-[var(--sloty-primary)]/30"
      data-testid="discovery-court-card"
    >
      <div className="aspect-[16/10] w-full bg-[var(--sloty-soft-mint)]">
        {showImage ? (
          <img
            alt={courtDiscoveryCopy.imageAlt(court.courtName)}
            className="h-full w-full object-cover"
            decoding="async"
            loading="lazy"
            onError={() => setHasImageError(true)}
            src={court.imageUrl ?? undefined}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-[var(--sloty-primary)]/60"
            data-testid="discovery-court-image-placeholder"
          >
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-black leading-7 text-[var(--sloty-text-primary)]">
            <Link
              className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
              to={schedulePath}
            >
              {court.courtName}
            </Link>
          </h3>
          {court.addressLabel ? (
            <p className="flex items-start gap-1.5 text-sm leading-6 text-[var(--sloty-text-muted)]">
              <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
              <span>{court.addressLabel}</span>
            </p>
          ) : null}
        </div>
        <ChevronLeft
          aria-hidden="true"
          className="mt-1 h-5 w-5 shrink-0 text-[var(--sloty-primary)]"
        />
      </div>
    </article>
  )
}
