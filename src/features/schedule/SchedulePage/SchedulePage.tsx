import { useState } from 'react'
import { MobileBottomNav } from '../../../shared/components/MobileBottomNav/MobileBottomNav'
import { BookingCard } from '../components/BookingCard/BookingCard'
import { ScheduleHeader } from '../components/ScheduleHeader/ScheduleHeader'
import {
  scheduleBookings,
  scheduleCourt,
  scheduleDateFilters,
  scheduleStaff,
  scheduleSummary,
} from '../scheduleMockData'
import type { ScheduleBooking } from '../schedule.types'

const statusLegend = [
  {
    label: 'متاح / ملغي',
    className: 'border-[var(--sloty-primary)] bg-white',
  },
  {
    label: 'مؤكد',
    className: 'border-[var(--sloty-success)] bg-[var(--sloty-success)]',
  },
  {
    label: 'انتظار الدفع',
    className: 'border-[var(--sloty-hold)] bg-[var(--sloty-hold)]',
  },
  {
    label: 'مكتمل',
    className: 'border-[var(--sloty-completed)] bg-[var(--sloty-completed)]',
  },
  {
    label: 'منتهي',
    className: 'border-[var(--sloty-expired)] bg-[var(--sloty-expired)]',
  },
]

function getStatusLabel(status: ScheduleBooking['status']): string {
  const statusLabels: Record<ScheduleBooking['status'], string> = {
    available: 'متاح',
    cancelled: 'ملغي',
    confirmed: 'مؤكد',
    hold: 'انتظار الدفع',
    completed: 'مكتمل',
    expired: 'منتهي',
    noShow: 'لم يحضر',
  }

  return statusLabels[status]
}

/**
 * Staff Today Schedule UI slice.
 *
 * This screen uses local typed mock data for visual preview only. It does not
 * call booking APIs or implement add-booking/payment/completion behavior.
 */
export function SchedulePage() {
  const [activeDateKey, setActiveDateKey] = useState('today')
  const [activeNavKey, setActiveNavKey] = useState('schedule')
  const [selectedSlot, setSelectedSlot] = useState<ScheduleBooking | null>(null)
  const earlySlots = scheduleBookings.slice(0, 3)
  const nightSlots = scheduleBookings.slice(3)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col bg-[var(--sloty-bg)]">
      <div className="space-y-4 md:space-y-6">
        <ScheduleHeader
          activeDateKey={activeDateKey}
          court={scheduleCourt}
          dateFilters={scheduleDateFilters}
          onDateChange={setActiveDateKey}
          staff={scheduleStaff}
          summary={scheduleSummary}
        />

        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] md:flex-row md:items-center md:justify-between md:px-5">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              لوحة الملعب
            </h2>
            <p className="text-sm text-[var(--sloty-text-muted)]">
              اختر فترة متاحة من اللوحة لبدء حجز جديد لاحقاً
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusLegend.map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-bg)] px-3 py-1 text-xs font-bold text-[var(--sloty-text-muted)]"
                key={item.label}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'h-3 w-3 rounded-full border-2',
                    item.className,
                  ].join(' ')}
                />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <section
          aria-label="لوحة فترات الملعب"
          className="relative overflow-hidden rounded-[28px] border border-[var(--sloty-border)] bg-cover bg-center shadow-[var(--sloty-shadow)]"
          style={{
            backgroundImage: "url('/images/sloty-court-board-bg.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-emerald-900/10 to-slate-950/35" />
          <div className="relative z-10 grid min-h-[660px] grid-cols-1 gap-4 p-4 sm:min-h-[560px] md:min-h-[480px] md:grid-cols-2 md:p-5 lg:min-h-[540px] lg:p-6">
            <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-white/10 p-3 backdrop-blur-[1px] md:p-4">
              <div>
                <p className="text-xs font-bold text-white/75">
                  الفترة المبكرة
                </p>
                <h3 className="text-lg font-black text-white">بداية اليوم</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {earlySlots.map((booking) => (
                  <BookingCard
                    booking={booking}
                    key={booking.id}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-slate-950/20 p-3 backdrop-blur-[1px] md:p-4">
              <div>
                <p className="text-xs font-bold text-white/75">
                  الفترة المسائية
                </p>
                <h3 className="text-lg font-black text-white">آخر اليوم</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {nightSlots.map((booking) => (
                  <BookingCard
                    booking={booking}
                    key={booking.id}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav activeKey={activeNavKey} onChange={setActiveNavKey} />

      {selectedSlot ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
          role="dialog"
        >
          <div className="w-full rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-md md:rounded-3xl">
            <div className="space-y-2">
              <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
                تفاصيل الفترة
              </p>
              <h2
                className="text-xl font-black text-[var(--sloty-text-primary)]"
                dir="ltr"
              >
                {selectedSlot.timeStart} - {selectedSlot.timeEnd}
              </h2>
              <p className="text-sm text-[var(--sloty-text-muted)]">
                الحالة: {getStatusLabel(selectedSlot.status)}
              </p>
              <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
                هذه نافذة مؤقتة للمعاينة فقط. إضافة الحجز أو الدفع ستأتي لاحقاً
                بعد اعتماد التدفق.
              </p>
            </div>
            <button
              className="mt-5 h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-white text-sm font-bold text-[var(--sloty-text-primary)]"
              onClick={() => setSelectedSlot(null)}
              type="button"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
