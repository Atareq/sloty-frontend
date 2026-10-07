import { useState } from 'react'
import { ChevronLeft, ImageOff, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { buildPublicCourtSchedulePath } from '../../publicSchedule/publicSchedule.helpers'
import { formatTime12Hour } from '../../schedule/scheduleBoard.helpers'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'
import type { DiscoveryCourt } from '../publicDiscovery.types'

export interface DiscoveryMatchedCourtCardProps {
  court: DiscoveryCourt
  /** Optional Phase 6 searched date (`YYYY-MM-DD`) carried into Public Schedule. */
  handoffDate?: string | null
}

/**
 * Phase 3/6 Court result card for time-filtered discovery searches.
 *
 * Displays:
 * - Real Court image (or neutral soft-mint placeholder when absent or failed)
 * - Real Court name (linked to the existing Public Schedule with `?date=YYYY-MM-DD`)
 * - Real address line from Backend
 * - `المواعيد المتاحة`: the subset of the visitor's requested times (`matchingTimes`)
 *   that Backend confirmed are available at this Court, rendered as accessible
 *   links to the Court's Public Schedule with `?date=YYYY-MM-DD&time=HH:MM` and
 *   zero nested interactive elements.
 */
export function DiscoveryMatchedCourtCard({
  court,
  handoffDate = null,
}: DiscoveryMatchedCourtCardProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const showImage = court.imageUrl !== null && !hasImageError
  const courtSchedulePath = buildPublicCourtSchedulePath(
    court.clubSlug,
    court.courtId,
    handoffDate ? { date: handoffDate } : null,
  )

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] shadow-[var(--sloty-shadow)] transition hover:border-[var(--sloty-primary)]"
      data-testid="discovery-court-card"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="aspect-[16/10] w-full shrink-0 bg-[var(--sloty-soft-mint)] sm:aspect-auto sm:h-auto sm:w-44">
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
              className="flex h-full min-h-32 w-full items-center justify-center text-[var(--sloty-primary)]/60"
              data-testid="discovery-court-image-placeholder"
            >
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-black leading-7 text-[var(--sloty-text-primary)]">
                <Link
                  className="rounded-lg transition hover:text-[var(--sloty-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30"
                  to={courtSchedulePath}
                >
                  {court.courtName}
                </Link>
              </h3>
              {court.addressLabel ? (
                <p className="flex items-start gap-1.5 text-sm leading-6 text-[var(--sloty-text-muted)]">
                  <MapPin
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span>{court.addressLabel}</span>
                </p>
              ) : null}
            </div>
            <ChevronLeft
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-[var(--sloty-primary)]"
            />
          </div>

          {court.matchingTimes.length > 0 ? (
            <div
              className="space-y-2 border-t border-[var(--sloty-border)] pt-3"
              data-testid="discovery-matching-times"
            >
              <p className="text-xs font-black text-[var(--sloty-text-primary)]">
                {courtDiscoveryCopy.availableMatchingTimesLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {court.matchingTimes.map((time) => {
                  const displayTime12 = formatTime12Hour(time)
                  const matchingTimePath = buildPublicCourtSchedulePath(
                    court.clubSlug,
                    court.courtId,
                    handoffDate ? { date: handoffDate, time } : null,
                  )

                  return (
                    <Link
                      aria-label={courtDiscoveryCopy.matchingTimeAriaLabel(
                        court.courtName,
                        time,
                        displayTime12,
                      )}
                      className="inline-flex min-h-11 min-w-[76px] flex-col items-center justify-center rounded-xl border-2 border-[#22C55E] bg-[var(--sloty-soft-mint)] px-3 py-1.5 text-center font-black text-[var(--sloty-primary-dark)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sloty-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/40"
                      data-testid={`discovery-matching-time-${time}`}
                      key={time}
                      to={matchingTimePath}
                    >
                      <span className="text-xs sm:text-sm" dir="ltr">
                        {displayTime12}
                      </span>
                      <span
                        className="mt-0.5 text-[10px] leading-tight opacity-85"
                        dir="ltr"
                      >
                        {time}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
