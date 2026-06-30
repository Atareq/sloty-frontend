import type {
  ScheduleBooking,
  ScheduleCourt,
  ScheduleDateFilter,
  ScheduleStaff,
  ScheduleSummary,
} from './schedule.types'

export const scheduleStaff: ScheduleStaff = {
  name: 'أحمد',
  role: 'موظف ملعب',
}

export const scheduleCourt: ScheduleCourt = {
  clubName: 'نادي النصر',
  courtName: 'ملعب 1',
  dateLabel: 'اليوم، الثلاثاء 30 يونيو',
}

export const scheduleDateFilters: ScheduleDateFilter[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'tomorrow', label: 'غداً' },
  { key: 'week', label: 'الأسبوع' },
]

export const scheduleBookings: ScheduleBooking[] = [
  {
    id: 'slot-1',
    status: 'available',
    timeStart: '06:00 م',
    timeEnd: '07:00 م',
    totalAmount: 250,
    paidAmount: 0,
  },
  {
    id: 'booking-1',
    status: 'hold',
    timeStart: '07:00 م',
    timeEnd: '08:00 م',
    totalAmount: 300,
    paidAmount: 0,
    customerName: 'محمود حسن',
    customerPhone: '01012345678',
    expiresIn: 'ينتهي خلال 10 ساعات',
  },
  {
    id: 'booking-2',
    status: 'confirmed',
    timeStart: '08:00 م',
    timeEnd: '09:00 م',
    totalAmount: 300,
    paidAmount: 50,
    customerName: 'أحمد محمد',
    customerPhone: '01123456789',
  },
  {
    id: 'booking-3',
    status: 'completed',
    timeStart: '09:00 م',
    timeEnd: '10:00 م',
    totalAmount: 300,
    paidAmount: 300,
    customerName: 'كريم علي',
    customerPhone: '01234567890',
  },
  {
    id: 'booking-4',
    status: 'expired',
    timeStart: '10:00 م',
    timeEnd: '11:00 م',
    totalAmount: 300,
    paidAmount: 0,
    customerName: 'حجز منتهي',
    customerPhone: '01000000000',
  },
  {
    id: 'booking-5',
    status: 'cancelled',
    timeStart: '11:00 م',
    timeEnd: '12:00 ص',
    totalAmount: 300,
    paidAmount: 0,
    customerName: 'حجز ملغي',
    customerPhone: '01000000001',
  },
]

export const scheduleSummary: ScheduleSummary = {
  bookingCount: scheduleBookings.filter(
    (booking) =>
      booking.status !== 'available' &&
      booking.status !== 'cancelled' &&
      booking.status !== 'expired',
  ).length,
  holdCount: scheduleBookings.filter((booking) => booking.status === 'hold')
    .length,
  collectedAmount: scheduleBookings.reduce(
    (total, booking) => total + booking.paidAmount,
    0,
  ),
  remainingAmount: scheduleBookings.reduce(
    (total, booking) =>
      booking.status === 'available'
        ? total
        : total + Math.max(booking.totalAmount - booking.paidAmount, 0),
    0,
  ),
}
