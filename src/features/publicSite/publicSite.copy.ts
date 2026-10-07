/**
 * Copy for Sloty's public, indexable pages.
 *
 * Visible text and SEO metadata both read from here so headings, descriptions,
 * and structured data describe the same product. Claims must stay true to the
 * shipped product: players browse real Courts and view public availability,
 * then contact the court; they cannot self-book yet. See docs/seo.md and
 * docs/copy.md.
 */

export const publicSiteIdentityCopy = {
  /** Canonical Arabic identity statement (About page and JSON-LD). */
  statement:
    'سلوتي (Sloty) منصة لحجز وإدارة ملاعب كرة القدم والمرافق الرياضية في مصر، تساعد اللاعبين على معرفة مواعيد الملاعب المتاحة، وتساعد أصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد والمدفوعات بسهولة.',
  /** English concept, rendered with `lang="en"`. */
  english:
    'Sloty is a platform for booking and managing football pitches and sports facilities in Egypt.',
  footerTagline: 'منصة مصرية لحجز وإدارة ملاعب كرة القدم والمرافق الرياضية.',
} as const

export const publicSiteNavCopy = {
  brand: 'Sloty | سلوتي',
  home: 'الرئيسية',
  about: 'عن سلوتي',
  login: 'تسجيل الدخول',
  staffLogin: 'تسجيل الدخول لفريق العمل',
  footerNavLabel: 'روابط سلوتي',
  breadcrumbLabel: 'مسار الصفحة',
} as const

/** Public player discovery at `/`: the primary SEO and product surface. */
export const homePageCopy = {
  metaTitle: 'Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم',
  metaDescription:
    'سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم، تساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد بسهولة.',
  heading: 'سلوتي لحجز ملاعب كرة القدم',
  subtitle: 'اعرف مواعيد الملاعب المتاحة واختر ملعبك',
  intro:
    'سلوتي (Sloty) منصة مصرية لحجز وإدارة الملاعب والمرافق الرياضية، تساعدك على معرفة مواعيد الملاعب المتاحة بسهولة.',
  courtsTitle: 'ملاعب كرة القدم',
  courtsHint:
    'اختر الملعب لتشاهد جدول مواعيده، ثم تواصل مع الملعب لتأكيد الحجز.',
  aboutTitle: 'تعرّف على سلوتي',
  aboutBody:
    'من هي سلوتي، وكيف تساعد اللاعبين وأصحاب الملاعب وفريق العمل على تنظيم وحجز الملاعب بسهولة.',
} as const

/**
 * Brand page at `/about/`: intentionally minimal, one message, one primary CTA.
 *
 * About is the only public page that tells the Assiut origin story; discovery
 * at `/`, root metadata, and root JSON-LD stay geography-neutral. Emoji are
 * kept separate so they render as decorative (`aria-hidden`) next to text.
 * `free*` copy is product-confirmed (management is free, no subscription).
 */
export const aboutPageCopy = {
  metaTitle: 'عن سلوتي | Sloty',
  metaDescription:
    'تعرّف على سلوتي (Sloty): منصة مصرية بدأت من أسيوط لتخلي إدارة ملاعب كرة القدم أبسط وأسهل لأصحاب الملاعب وفريق العمل.',
  heading: 'عن سلوتي',
  breadcrumbCurrent: 'عن سلوتي',
  heroTitle: 'إحنا Sloty',
  heroTitleEmoji: '⚽️',
  heroLead: 'منصة مصرية بنخلي إدارة الملاعب أبسط وأسهل.',
  heroOrigin: 'بدأنا من أسيوط، والهدف أكبر من أسيوط.',
  heroOriginEmoji: '🇪🇬',
  whoTitle: 'من نحن؟',
  whoBody:
    'Sloty منصة بدأت من أسيوط لمساعدة أصحاب الملاعب وفريق العمل على إدارة ملعبهم بسهولة.',
  whyTitle: 'ليه Sloty؟',
  whyBody:
    'لأن إدارة الملعب فيها تفاصيل كتير كل يوم، وإحنا بنحاول نخلي التعامل معاها أبسط.',
  audiencesTitle: 'مين Sloty ليه؟',
  audiences: [
    { key: 'owners', emoji: '🏟️', label: 'أصحاب الملاعب وفريق العمل' },
    { key: 'players', emoji: '⚽️', label: 'اللاعبين' },
  ],
  goalTitle: 'هدفنا',
  goalStatement: 'إن التكنولوجيا تكون متاحة لكل صاحب ملعب.',
  freeTitle: 'مجاني 100%',
  freeTitleEmoji: '🤍',
  freeBody: 'إدارة ملعبك من غير اشتراك.',
  ctaTitle: 'عايز تبدأ مع Sloty؟',
  ctaAction: 'ابدأ مجانًا',
  contactSheetTitle: 'ابدأ مع Sloty',
  contactSheetBody: 'اختار الطريقة المناسبة ليك:',
  callAction: 'اتصل بنا',
  callActionEmoji: '📞',
  emailAction: 'راسلنا',
  emailActionEmoji: '✉️',
} as const
