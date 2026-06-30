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
    id: 'slot-0600',
    status: 'available',
    startTime: '06:00',
    period: 'day',
  },
  {
    id: 'slot-0700',
    status: 'confirmed',
    startTime: '07:00',
    period: 'day',
  },
  {
    id: 'slot-0800',
    status: 'cancelled',
    startTime: '08:00',
    period: 'day',
  },
  {
    id: 'slot-0900',
    status: 'available',
    startTime: '09:00',
    period: 'day',
  },
  {
    id: 'slot-1000',
    status: 'confirmed',
    startTime: '10:00',
    period: 'day',
  },
  {
    id: 'slot-1100',
    status: 'cancelled',
    startTime: '11:00',
    period: 'day',
  },
  {
    id: 'slot-1200',
    status: 'available',
    startTime: '12:00',
    period: 'day',
  },
  {
    id: 'slot-1300',
    status: 'available',
    startTime: '13:00',
    period: 'day',
  },
  {
    id: 'slot-1400',
    status: 'confirmed',
    startTime: '14:00',
    period: 'day',
  },
  {
    id: 'slot-1500',
    status: 'available',
    startTime: '15:00',
    period: 'day',
  },
  {
    id: 'slot-1600',
    status: 'cancelled',
    startTime: '16:00',
    period: 'day',
  },
  {
    id: 'slot-1700',
    status: 'available',
    startTime: '17:00',
    period: 'day',
  },
  {
    id: 'slot-1800',
    status: 'confirmed',
    startTime: '18:00',
    period: 'night',
  },
  {
    id: 'slot-1900',
    status: 'available',
    startTime: '19:00',
    period: 'night',
  },
  {
    id: 'slot-2000',
    status: 'available',
    startTime: '20:00',
    period: 'night',
  },
  {
    id: 'slot-2100',
    status: 'cancelled',
    startTime: '21:00',
    period: 'night',
  },
  {
    id: 'slot-2200',
    status: 'confirmed',
    startTime: '22:00',
    period: 'night',
  },
  {
    id: 'slot-2300',
    status: 'available',
    startTime: '23:00',
    period: 'night',
  },
  {
    id: 'slot-0000',
    status: 'available',
    startTime: '00:00',
    period: 'night',
  },
  {
    id: 'slot-0100',
    status: 'confirmed',
    startTime: '01:00',
    period: 'night',
  },
  {
    id: 'slot-0200',
    status: 'available',
    startTime: '02:00',
    period: 'night',
  },
  {
    id: 'slot-0300',
    status: 'cancelled',
    startTime: '03:00',
    period: 'night',
  },
  {
    id: 'slot-0400',
    status: 'available',
    startTime: '04:00',
    period: 'night',
  },
  {
    id: 'slot-0500',
    status: 'available',
    startTime: '05:00',
    period: 'night',
  },
]

export const scheduleSummary: ScheduleSummary = {
  availableCount: scheduleBookings.filter((booking) => booking.status === 'available')
    .length,
  confirmedCount: scheduleBookings.filter((booking) => booking.status === 'confirmed')
    .length,
  cancelledCount: scheduleBookings.filter((booking) => booking.status === 'cancelled')
    .length,
  totalSlots: scheduleBookings.length,
}
