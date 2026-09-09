import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { AppDateNavigator } from '../../../shared/components/AppDateNavigator/AppDateNavigator'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { formatDateInputValue } from '../../../shared/utils/date'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import {
  getEgyptToday,
  getPublicScheduleDateWindow,
  isDateInsidePublicScheduleWindow,
  mapPublicAvailabilityToScheduleSlots,
} from '../publicSchedule.helpers'
import { getPublicCourtAvailability } from '../publicScheduleApi'
import type { PublicCourtAvailabilityResponse } from '../publicSchedule.types'
import { PublicSlotCard } from '../components/PublicSlotCard'
import { PublicScheduleInfoNotice } from '../components/PublicScheduleInfoNotice'
import { ShareCourtScheduleButton } from '../components/ShareCourtScheduleButton'
import { useAttentionHighlight } from '../hooks/useAttentionHighlight'

const schedulePeriodStyles = {
  am: {
    section:
      'border-amber-100/70 bg-white/[0.18] shadow-amber-950/10 ring-1 ring-white/65',
    overlay:
      'bg-[linear-gradient(135deg,rgba(255,249,232,0.26)_0%,rgba(255,243,196,0.13)_46%,rgba(253,244,215,0.07)_68%,transparent_100%)]',
    header:
      'border-amber-100/80 bg-white/75 text-amber-950 shadow-amber-950/5',
    kicker: 'text-amber-700',
  },
  pm: {
    section:
      'border-slate-300/35 bg-slate-900/54 shadow-slate-950/20 ring-1 ring-white/18',
    overlay:
      'bg-[linear-gradient(135deg,rgba(224,242,254,0.13)_0%,rgba(226,232,240,0.08)_44%,rgba(148,163,184,0.05)_70%,transparent_100%)]',
    header:
      'border-slate-300/30 bg-slate-950/30 text-white shadow-slate-950/15',
    kicker: 'text-slate-100',
  },
} as const

const publicStatusLegend = [
  {
    label: 'متاح',
    className: 'border-[#22C55E] bg-white',
  },
  {
    label: 'غير متاح',
    className: 'border-slate-300 bg-slate-100',
  },
]

/**
 * Public guest schedule page.
 *
 * Provides players with direct read-only court availability without authentication.
 * Consumes the sanitized public endpoint:
 * GET /api/v1/public/clubs/{club_slug}/courts/{court_id}/availability/
 *
 * Enforces a strict 32-date window (yesterday to today + 30) and isolated guest privacy.
 */
export function PublicSchedulePage() {
  const { clubSlug, courtId } = useParams<{
    clubSlug: string
    courtId: string
  }>()
  const location = useLocation()
  const navigate = useNavigate()

  const courtIdNumber = Number(courtId)
  const isParamsValid = Boolean(
    clubSlug?.trim() && Number.isFinite(courtIdNumber) && courtIdNumber > 0,
  )

  const todayDate = useMemo(
    () => formatDateInputValue(getEgyptToday()),
    [],
  )
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [availability, setAvailability] =
    useState<PublicCourtAvailabilityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInfoNotice, setShowInfoNotice] = useState(false)

  const dateWindow = useMemo(() => getPublicScheduleDateWindow(), [])

  const loginAttention = useAttentionHighlight(1500)
  const morningAttention = useAttentionHighlight(1500)
  const eveningAttention = useAttentionHighlight(1500)

  const morningPeriodRef = useRef<HTMLDivElement>(null)
  const eveningPeriodRef = useRef<HTMLDivElement>(null)

  // Fetch sanitized public court availability
  useEffect(() => {
    if (!isParamsValid || !clubSlug) {
      return
    }

    const activeClubSlug = clubSlug
    const controller = new AbortController()

    async function loadAvailability(): Promise<void> {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getPublicCourtAvailability(
          activeClubSlug,
          courtIdNumber,
          { date: selectedDate },
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) {
          setAvailability(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            getApiErrorMessage(
              err,
              'تعذر تحميل جدول المواعيد. يرجى المحاولة مرة أخرى.',
            ),
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadAvailability()

    return () => {
      controller.abort()
    }
  }, [clubSlug, courtIdNumber, isParamsValid, selectedDate])

  const slots = useMemo(() => {
    if (!availability) {
      return []
    }
    return mapPublicAvailabilityToScheduleSlots(availability)
  }, [availability])

  const amSlots = useMemo(
    () => slots.filter((slot) => slot.period === 'am'),
    [slots],
  )
  const pmSlots = useMemo(
    () => slots.filter((slot) => slot.period === 'pm'),
    [slots],
  )

  const availableCount = useMemo(
    () => slots.filter((slot) => slot.isAvailable).length,
    [slots],
  )

  function handleDateChange(nextDate: string): void {
    if (isDateInsidePublicScheduleWindow(nextDate)) {
      setSelectedDate(nextDate)
    }
  }

  function handleSelectSlot(): void {
    setShowInfoNotice(true)
    loginAttention.trigger()
  }

  function handleMorningGuidance(): void {
    morningAttention.trigger()
    morningPeriodRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  function handleEveningGuidance(): void {
    eveningAttention.trigger()
    eveningPeriodRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  function handleLoginClick(): void {
    navigate('/login', {
      state: { guestReturnTo: location.pathname },
    })
  }

  const courtTitle = availability?.court?.name || 'جدول المواعيد'
  const clubName = availability?.club?.name || null

  const loginButton = (
    <button
      aria-label="تسجيل الدخول لفريق العمل"
      className={[
        'inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold transition focus:outline-none focus:ring-2',
        loginAttention.isHighlighted
          ? 'bg-amber-300 text-amber-950 ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
          : 'bg-white/15 text-white hover:bg-white/25 focus:ring-white/70',
      ].join(' ')}
      data-testid="public-schedule-login-button"
      onClick={handleLoginClick}
      type="button"
    >
      تسجيل الدخول
    </button>
  )

  if (!isParamsValid) {
    return (
      <div className="min-h-screen bg-[var(--sloty-bg)] p-4" dir="rtl">
        <PageHeader
          endAction={loginButton}
          showHomeButton={false}
          showMenuButton={false}
          title="جدول المواعيد"
        />
        <div className="mx-auto mt-8 max-w-lg">
          <AppCard className="p-6 text-center space-y-3">
            <p className="text-base font-bold text-[var(--sloty-danger)]">
              رابط الملعب غير صحيح أو غير متوفر.
            </p>
            <p className="text-xs text-[var(--sloty-text-muted)]">
              يرجى التأكد من الرابط المستخدم والمحاولة مرة أخرى.
            </p>
          </AppCard>
        </div>
      </div>
    )
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {clubSlug && courtIdNumber ? (
        <ShareCourtScheduleButton
          clubSlug={clubSlug}
          courtId={courtIdNumber}
          courtName={availability?.court?.name}
          variant="header"
        />
      ) : null}
      {loginButton}
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--sloty-bg)]" dir="rtl">
      <PageHeader
        clubName={clubName}
        endAction={headerActions}
        showHomeButton={false}
        showMenuButton={false}
        subtitle="مواعيد الحجز المتاحة للملعب"
        title={courtTitle}
      />

      {showInfoNotice ? (
        <PublicScheduleInfoNotice
          onDismiss={() => setShowInfoNotice(false)}
        />
      ) : null}

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
        {/* Date Navigator bounded to 32 days */}
        <AppCard className="p-3 sm:p-4">
          <AppDateNavigator
            maxDate={dateWindow.dateTo}
            minDate={dateWindow.dateFrom}
            onChange={handleDateChange}
            value={selectedDate}
          />
        </AppCard>

        {/* Legend and stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-bold text-[var(--sloty-text-muted)]">
          <div className="flex items-center gap-4">
            {publicStatusLegend.map((item) => (
              <div className="flex items-center gap-1.5" key={item.label}>
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-full border ${item.className}`}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div>
            <span>المتاح اليوم: </span>
            <span className="font-black text-[var(--sloty-primary-dark)]">
              {availableCount}
            </span>
            <span className="text-[var(--sloty-text-muted)]"> / {slots.length}</span>
          </div>
        </div>

        {/* Court Board Container */}
        <div
          aria-label="لوحة فترات الملعب العامة"
          className="relative overflow-hidden rounded-[28px] border border-[var(--sloty-border)] bg-cover bg-center shadow-[var(--sloty-shadow)]"
          style={{
            backgroundImage: "url('/images/sloty-court-board-bg.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-emerald-900/10 to-slate-950/35" />

          <div className="relative z-10 grid min-h-[480px] grid-cols-1 gap-3 p-2 sm:gap-4 sm:p-4 md:grid-cols-2 md:p-5 lg:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-8 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                  جاري تحميل المواعيد...
                </p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-8 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-danger)]">
                  {error}
                </p>
              </div>
            ) : availability?.is_closed ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-8 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                  الملعب مغلق في هذا التاريخ.
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-8 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                  لا توجد فترات عمل معلنة لهذا اليوم.
                </p>
              </div>
            ) : (
              <>
                {/* Morning Period */}
                <div
                  className={[
                    'relative flex min-h-0 flex-col justify-between overflow-hidden rounded-3xl border p-2 shadow-lg backdrop-blur-[1px] transition duration-300 sm:p-3 md:p-4',
                    schedulePeriodStyles.am.section,
                    morningAttention.isHighlighted
                      ? 'ring-2 ring-amber-300/80 shadow-[0_0_34px_rgba(251,191,36,0.24)]'
                      : '',
                  ].join(' ')}
                  data-testid="public-schedule-period-am"
                  ref={morningPeriodRef}
                >
                  <div
                    aria-hidden="true"
                    className={[
                      'pointer-events-none absolute inset-0',
                      schedulePeriodStyles.am.overlay,
                    ].join(' ')}
                  />
                  <div className="relative z-10">
                    <div
                      className={[
                        'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                        schedulePeriodStyles.am.header,
                      ].join(' ')}
                    >
                      <p
                        className={[
                          'text-xs font-black',
                          schedulePeriodStyles.am.kicker,
                        ].join(' ')}
                      >
                        فترة نهارية
                      </p>
                      <button
                        aria-pressed={morningAttention.isHighlighted}
                        className="mt-1 -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between rounded-xl px-2 text-right text-lg font-black transition hover:bg-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                        onClick={handleMorningGuidance}
                        type="button"
                      >
                        <span>مواعيد الصباح</span>
                        <span
                          aria-hidden="true"
                          className={[
                            'text-base transition-transform duration-300',
                            morningAttention.isHighlighted ? 'scale-110' : '',
                          ].join(' ')}
                        >
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {amSlots.length > 0 ? (
                      amSlots.map((slot) => (
                        <PublicSlotCard
                          key={slot.id}
                          onSelect={handleSelectSlot}
                          slot={slot}
                        />
                      ))
                    ) : (
                      <p className="col-span-full py-4 text-center text-xs font-bold text-amber-950/60">
                        لا توجد فترات صباحية
                      </p>
                    )}
                  </div>
                </div>

                {/* Evening Period */}
                <div
                  className={[
                    'relative flex min-h-0 flex-col justify-between overflow-hidden rounded-3xl border p-2 shadow-lg backdrop-blur-[1px] transition duration-300 sm:p-3 md:p-4',
                    schedulePeriodStyles.pm.section,
                    eveningAttention.isHighlighted
                      ? 'ring-2 ring-sky-300/80 shadow-[0_0_34px_rgba(56,189,248,0.24)]'
                      : '',
                  ].join(' ')}
                  data-testid="public-schedule-period-pm"
                  ref={eveningPeriodRef}
                >
                  <div
                    aria-hidden="true"
                    className={[
                      'pointer-events-none absolute inset-0',
                      schedulePeriodStyles.pm.overlay,
                    ].join(' ')}
                  />
                  <div className="relative z-10">
                    <div
                      className={[
                        'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                        schedulePeriodStyles.pm.header,
                      ].join(' ')}
                    >
                      <p
                        className={[
                          'text-xs font-black',
                          schedulePeriodStyles.pm.kicker,
                        ].join(' ')}
                      >
                        فترة مسائية
                      </p>
                      <button
                        aria-pressed={eveningAttention.isHighlighted}
                        className="mt-1 -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between rounded-xl px-2 text-right text-lg font-black transition hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        onClick={handleEveningGuidance}
                        type="button"
                      >
                        <span>مواعيد المساء</span>
                        <span
                          aria-hidden="true"
                          className={[
                            'text-base transition-transform duration-300',
                            eveningAttention.isHighlighted ? 'scale-110' : '',
                          ].join(' ')}
                        >
                          🌙
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {pmSlots.length > 0 ? (
                      pmSlots.map((slot) => (
                        <PublicSlotCard
                          key={slot.id}
                          onSelect={handleSelectSlot}
                          slot={slot}
                        />
                      ))
                    ) : (
                      <p className="col-span-full py-4 text-center text-xs font-bold text-slate-200/60">
                        لا توجد فترات مسائية
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
