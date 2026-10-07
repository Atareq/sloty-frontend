# Sloty UI & Design System

This document defines the visual design system, interaction patterns, and reusable component standards for the Sloty frontend.

---

## 1. Core Design Principle: KEEP IT UNITED

```text
KEEP IT UNITED
same behavior → same shared component
```

- Always reuse existing shared components from [`src/shared/components/`](../src/shared/components/).
- Never copy-paste or fork components into "v2", "wizard", or feature-specific parallel variants.
- Visual styles, tokens, and interactions must remain unified across authenticated and public surfaces.

---

## 2. Layout, RTL, & Mobile-First Standards

### Arabic-First & RTL
- Sloty is an Arabic-first, RTL-first product (`dir="rtl"`, `lang="ar"`).
- Use logical margins and padding (`ms-`, `me-`, `ps-`, `pe-`) or RTL-aware flex layouts.
- Primary navigation and information flow runs right-to-left.

### Mobile-First & Responsive Breakpoints
- Start layouts from mobile viewports (375px–428px) and progressively enhance for tablet (`md:`, 768px) and desktop (`lg:`, 1024px; `xl:`, 1280px).
- **No Centered Phone Mockups:** Desktop layouts must adapt intelligently to wide screens, using expanded data tables, split panels, or multi-column grids.
- **Touch Targets & Form Inputs:**
  - Form controls (`input`, `select`, `textarea`) must maintain at least `16px` (`text-base`) on mobile touch devices to prevent mobile browser auto-zoom.
  - Interactive targets must maintain a minimum touch area of `44px × 44px`.

---

## 3. Brand Palette & Visual Tokens

Sloty's canonical palette uses a distinct green brand identity:

- **Primary Green:** `#22C55E` (`var(--sloty-primary)`)
- **Primary Dark / Surfaces:** `#15803D` / `#166534` (`var(--sloty-primary-dark)`)
- **Green Surface Button:** `.sloty-green-surface-button` (used for active selection, confirmed states, primary CTA)
- **Backgrounds:**
  - Page Background: `var(--sloty-bg)` (`#F8FAFC`)
  - Card / Modal Surface: `var(--sloty-surface)` (`#FFFFFF`)
  - Subtle Muted Surface: `#F1F5F9`
- **Borders & Radii:**
  - Cards, sheets, and buttons standard radius: `rounded-2xl` (16px).
  - Dialogs and outer containers: `rounded-3xl` (24px).
  - Subtle borders: `border border-[var(--sloty-border)]` (`#E2E8F0`).

---

## 4. Canonical Shared Components

### PageHeader (`src/layout/AppShell/AppShell.tsx`)
- **Exactly ONE PageHeader:** Rendered at the shell level in `AppShell`.
- Feature pages must **never** create custom inner headers.
- Supports title, optional back navigation (`showBack`), and the dynamic `PageHeaderAction` slot (e.g. Share Court Schedule).

### AppSheet (`src/shared/components/AppSheet/AppSheet.tsx`)
- Standard modal container for temporary workflows:
  - Mobile: Smooth slide-up bottom sheet with swipe-to-dismiss gesture.
  - Desktop: Centered modal dialog with backdrop blur.
- Optional `footer` slot: header and footer stay fixed and only the content scrolls (used by the public discovery selectors' sticky `مسح الاختيار`). Without `footer`, the whole panel scrolls as before. Never build a separate sticky-footer sheet.
- Used by: Add Booking, Booking Actions, Payment Recording, Filters, Reschedule, Details.

### AppButton (`src/shared/components/AppButton/AppButton.tsx`)
- Canonical button primitive supporting variants:
  - `primary`: Solid Sloty green (`sloty-green-surface-button`).
  - `secondary`: Neutral slate surface.
  - `outline`: Bordered with transparent background.
  - `danger`: Rose/red for destructive actions (cancel, void).
  - `ghost`: Borderless text action.
- Supports `isLoading` with animated spinner, and native `disabled` states.

### AppCard (`src/shared/components/AppCard/AppCard.tsx`)
- Standard surface card: `rounded-2xl border border-[var(--sloty-border)] bg-white p-4 shadow-sm`.
- Used across Dashboard, Schedule summary, Booking list items, and Transaction list items.

### AppSuccessNotice (`src/shared/components/AppSuccessNotice/AppSuccessNotice.tsx`)
- Standard non-intrusive floating feedback banner for successful actions (e.g. "تم تسجيل الدفعة بنجاح").

---

## 5. List, Search, & Filter Patterns

```text
Booking History = Transaction History structure
```

Booking History and Transaction History share identical structural patterns:

1. **Search (`SearchInput`):**
   - Real-time debounced text input.
   - Clears via standard reset affordance.
2. **Filters (`FilterSheet`, `FilterCheckboxGroup`):**
   - Opened via filter button displaying active filter count badge.
   - Quick filters are minimized to domain-essential filters only.
3. **Order By (`OrderByControl` / `SortOrderToggle`):**
   - Shared sorting control toggling ascending/descending order with field selection.
4. **Pagination (`AppPagination`):**
   - Standardized page navigation (`السابق`, page indicators, `التالي`).
5. **Access Boundaries:**
   - Transactions are accessed strictly through `عهدتي` / Custody workflows, not through top-level burger menu shortcuts.

---

## 6. Offline UI & Disabled-Action Presentation

When the device is offline or the backend is unreachable (`isOfflineLike === true`):

- **Data Visibility:** Cached and loaded data remains fully visible.
- **Action Blocking:** Interactive mutations are disabled:
  - Schedule slot buttons are non-clickable (`handleSelectSlot` early returns).
  - Booking creation, payment recording, cancellation, and settlement buttons are disabled or hidden.
- **Freshness Banner:** The last updated timestamp is visible directly above the Slots section in both online and offline modes.

