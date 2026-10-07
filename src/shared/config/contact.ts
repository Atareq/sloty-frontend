/**
 * Canonical, product-approved Sloty contact details.
 *
 * The single source for public contact actions (the About page «ابدأ مجانًا»
 * sheet). Never hardcode these values in pages or components.
 *
 * Approval: both values were provided explicitly by the product owner on
 * 2026-10-06 as Sloty's public contact details for the About CTA.
 */
export const slotyContact = {
  /** International (E.164) format so `tel:` dials correctly from any device. */
  phone: '+201002828648',
  email: 'tarekahmad8509@gmail.com',
} as const

/** Semantic `tel:` / `mailto:` hrefs; the browser picks the right app. */
export const slotyContactLinks = {
  phone: `tel:${slotyContact.phone}`,
  email: `mailto:${slotyContact.email}`,
} as const
