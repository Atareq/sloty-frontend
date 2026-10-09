/**
 * Copy for the public Court discovery list and Phase 2/3/4/5 search filters.
 *
 * Cards show real Backend data only; this module holds state, filter, and
 * action text, never Court content. See docs/copy.md section 11.
 */
export const courtDiscoveryCopy = {
  loading: 'جاري تحميل الملاعب...',
  error: 'تعذر تحميل الملاعب الآن. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'مفيش ملاعب متاحة حاليًا.',
  emptyDayAndTimes: 'مفيش ملاعب متاحة في المواعيد دي حاليًا.',
  emptyDayOnly: 'مفيش ملاعب متاحة في اليوم ده حاليًا.',
  emptyCourtDayAndTimes: 'الملعب ده مش متاح في المواعيد دي حاليًا.',
  emptyCourtDayOnly: 'الملعب ده مش متاح في اليوم ده حاليًا.',
  loadMore: 'عرض ملاعب أكثر',
  loadingMore: 'جاري تحميل المزيد...',
  loadMoreError: 'تعذر تحميل المزيد من الملاعب. حاول مرة أخرى.',
  imageAlt: (courtName: string) => `صورة ${courtName}`,

  /** Phase 2/4/5 filter bar controls; every change searches immediately */
  filterGroupAriaLabel: 'تصفية الملاعب حسب الملعب واليوم والمواعيد',
  chooseCourt: 'اختار ملعب معين',
  chooseDay: 'اختار اليوم',
  chooseTimes: 'اختار المواعيد',
  /** Sticky selector-sheet footer action: clears only that selector. */
  clearSelection: 'مسح الاختيار',

  /** Phase 2/3/4/5 filtered results headings & labels */
  matchingTimesHeading: 'الملاعب المناسبة لمواعيدك',
  availableDayHeading: 'الملاعب المتاحة في اليوم المختار',
  selectedCourtHeading: 'الملعب المختار',
  availableMatchingTimesLabel: 'المواعيد المتاحة',
  matchingTimeAriaLabel: (courtName: string, time24: string, time12: string) =>
    `موعد متاح ${time24} (${time12}) في ${courtName}`,

  /** Phase 2 day + time sheet copy */
  chooseDayFirstHint: 'اختار اليوم الأول عشان نعرض مواعيده',
  changeDayAction: 'تغيير اليوم',
  timeSelectionHint: 'اختار حتى 5 مواعيد',
  fiveTimesSelected: 'تم اختيار 5 مواعيد',
  doneSelectingTimes: 'تم',
  morningPeriodKicker: 'الفترة الصباحية',
  morningPeriodTitle: 'مواعيد الصباح',
  eveningPeriodKicker: 'الفترة المسائية',
  eveningPeriodTitle: 'مواعيد المساء',
  slotSelectedLabel: 'مختار',
} as const
