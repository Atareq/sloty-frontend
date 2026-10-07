# SEO and Public Player Discovery

This document is the canonical reference for how the Sloty frontend presents itself to search engines and social scrapers. The SEO strategy follows the public player discovery product: **the product is the SEO**. It describes what is implemented, the rules for extending it, and the phases that are not built yet.

---

## 1. SEO identity and hierarchy

| | |
| :--- | :--- |
| **Primary SEO entity** | Sloty / سلوتي |
| **Primary category** | Football pitch booking and management (حجز وإدارة ملاعب كرة القدم) |
| **Geographic scope** | Not hard-coded by FE |
| **Discovery source** | Backend-authoritative publicly discoverable Courts |
| **Current phase** | Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 |
| **Primary SEO/product route** | Public player discovery at `/` |
| **Court pages** | Real downstream product pages, not the primary SEO strategy |

The journey search supports:

```text
Google
  ↓
Sloty / سلوتي                       /           (public discovery)
  ↓
ملاعب كرة القدم                     /           (Courts section)
  ↓
Browse real Courts (or filter by Day + up to 5 Times)
  ↓
Choose Court → Public Schedule      /public/:clubSlug/courts/:courtId/schedule
```

It is not "Google → hundreds of thin Court pages" and not "Google → keyword article → search again for the product".

Canonical Arabic identity statement (JSON-LD `description`):

```text
سلوتي (Sloty) منصة لحجز وإدارة ملاعب كرة القدم والمرافق الرياضية في مصر، تساعد اللاعبين على معرفة مواعيد الملاعب المتاحة، وتساعد أصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد والمدفوعات بسهولة.
```

English concept (JSON-LD `disambiguatingDescription`):

```text
Sloty is a platform for booking and managing football pitches and sports facilities in Egypt.
```

The statement's meaning is reused naturally in titles, descriptions, visible copy, and structured data; it is not pasted mechanically everywhere. Public copy stays true to the shipped product: players browse real Courts and view public availability, then **contact the court to confirm**. They cannot self-book yet. All public-site copy lives in [`src/features/publicSite/publicSite.copy.ts`](../src/features/publicSite/publicSite.copy.ts); discovery state copy lives in [`src/features/publicDiscovery/publicDiscovery.copy.ts`](../src/features/publicDiscovery/publicDiscovery.copy.ts).

---

## 2. Routes and indexing policy

### Indexable public routes

| Route | Canonical URL | Page | Static file | Role |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `https://sloty.baronlearning.com/` | `PublicHomePage` (via `HomeRoute`) | `dist/index.html` | Public player discovery: identity + real Courts |
| `/about/` | `https://sloty.baronlearning.com/about/` | `AboutPage` | `dist/about/index.html` | Brand and trust page; lists no Courts |

These two routes are the complete list in `indexablePublicPages` ([`publicSite.seo.ts`](../src/features/publicSite/publicSite.seo.ts)) and the only URLs in `sitemap.xml`. The router matches `/about` with or without the trailing slash; links and canonicals always use `/about/`.

`/` is shared with the authenticated app: [`HomeRoute`](../src/app/HomeRoute.tsx) renders public discovery only for visitors **without a session in a normal browser tab**. Signed-in users, session hydration/errors, and installed-PWA launches keep the role-aware `AuthLandingRedirect` (a signed-out standalone launch still goes to `/login`). Login always offers `المتابعة كزائر`, which navigates to `/` with `guestHomeEntryState` so the public discovery page renders even inside the installed app.

### Non-indexable routes (rule)

Any route **without** `handle: routeSeo(...)` in [`src/app/router.tsx`](../src/app/router.tsx) inherits `privateAppSeo`:

```html
<title>Sloty | سلوتي</title>
<meta name="robots" content="noindex, nofollow">
```

with no description, canonical, Open Graph, or JSON-LD. This covers `/login`, `/select-club`, every `AppShell` route (`/schedule`, `/dashboard`, `/bookings`, `/transactions`, `/settlements/**`, `/settings/**`, `/audit-logs`, `/admin/**`), and any future route that forgets to declare SEO.

The guest Public Schedule (`/public/:clubSlug/courts/:courtId/schedule`) is **public but noindex** (`publicScheduleSeo`, title `جدول مواعيد الملعب | Sloty`). Discovery links to it; it is the Court destination, not a search landing page (section 11).

Authentication, not robots directives, protects private data. `noindex` only keeps application screens out of results.

---

## 3. Architecture: one SEO system

```text
Route table (src/app/router.tsx)
  handle: routeSeo(homePageSeo | aboutPageSeo | publicScheduleSeo)   ← or nothing → privateAppSeo
        │
        ├── runtime ── SeoRouteBoundary (root layout route)
        │                └── applyDocumentSeo(document, seo, origin)
        │
        └── build ──── seoBuildPlugin (Vite, generateBundle)
                         └── seoPrerender.renderStaticSeoFiles()
                               ├── renderToString(<Page />)
                               └── renderSeoHeadHtml()
                                        ▲
         both paths call ── buildSeoHeadTags(seo, { origin, includeUrlIdentity })
```

| File | Responsibility |
| :--- | :--- |
| [`src/core/seo/seo.types.ts`](../src/core/seo/seo.types.ts) | `PageSeo` = `IndexablePageSeo` (title, description, canonical path, optional JSON-LD) or `NoindexPageSeo` (title only) |
| [`src/core/seo/seoHead.ts`](../src/core/seo/seoHead.ts) | `buildSeoHeadTags()`: the only place deciding which tags a page emits; HTML serialization and JSON-LD escaping |
| [`src/core/seo/seoDocument.ts`](../src/core/seo/seoDocument.ts) | `applyDocumentSeo()`: replaces every `[data-sloty-seo]` head tag on navigation |
| [`src/core/seo/SeoRouteBoundary.tsx`](../src/core/seo/SeoRouteBoundary.tsx) | Root layout route; resolves `handle.seo` from `useMatches()` |
| [`src/core/seo/seoRoute.ts`](../src/core/seo/seoRoute.ts) | `routeSeo()` helper and `resolveRouteSeo()` (deepest handle wins, default `privateAppSeo`) |
| [`src/core/seo/seoConfig.ts`](../src/core/seo/seoConfig.ts) | Brand names, OG locale/image, managed-tag marker, `privateAppSeo` |
| [`src/core/seo/publicSiteOrigin.ts`](../src/core/seo/publicSiteOrigin.ts) | Canonical origin from `VITE_PUBLIC_SITE_URL` |
| [`src/core/seo/seoStaticFiles.ts`](../src/core/seo/seoStaticFiles.ts) | `robots.txt`, `sitemap.xml`, HTML template injection, deep-link guard, `app.html` fallback |
| [`src/core/seo/seoBuildPlugin.ts`](../src/core/seo/seoBuildPlugin.ts) | Build-only Vite plugin (Node) |
| [`src/app/seoPrerender.tsx`](../src/app/seoPrerender.tsx) | SSR entry rendering public pages and returning all static SEO files |
| [`src/features/publicSite/`](../src/features/publicSite/) | Public pages (`PublicHomePage`, `AboutPage`), layout, copy, SEO definitions and JSON-LD |
| [`src/features/publicDiscovery/`](../src/features/publicDiscovery/) | Public Court discovery API, mapper, hook, Phase 2/4/5 filter sheets, and Phase 1/3/6 Court list/card UI & Schedule handoff (section 4) |

Rules:

- Pages never set `document.title` or head tags. Declare SEO on the route.
- Never add `<meta name="keywords">`.
- Public pages reuse the canonical `PageHeader` (its title is the page H1), `AppCard`, `AppButton`, and `getAppButtonClassName()` for button-styled links.

---

## 4. Public player discovery

### Visible order on `/`

```text
PageHeader H1   سلوتي لحجز ملاعب كرة القدم
short intro     one sentence of Sloty identity
H2              ملاعب كرة القدم
                اختر الملعب لتشاهد جدول مواعيده، ثم تواصل مع الملعب لتأكيد الحجز.
filter bar      [ اختار ملعب معين ] [ اختار اليوم ] [ اختار المواعيد ] (no Search or clear-all button)
Court cards     real Courts from Backend → existing Public Schedule
secondary       تعرّف على سلوتي (→ /about/); staff login only in the header and footer (nofollow)
```

There is no SEO article before the Courts. Brand, audience, and owner feature content lives on `/about/`.

### Data flow

```text
Default browse & Phase 4 Court-selector options:
  GET /api/v1/public/courts/?page=1                                  (anonymous)
        ↓
  publicDiscoveryApi.listPublicCourts()
        ↓
  mapDiscoveryCourtPageToOptionPage()         for DiscoveryCourtFilterSheet options

Phase 2/3/4/5 filtered search:
  GET /api/v1/public/courts/search/?court_id=12&page=1               (Phase 4 Court-only)
  GET /api/v1/public/courts/search/?date=YYYY-MM-DD&times=10:00,11:00&page=1 (Phase 2/3 Day + Times)
  GET /api/v1/public/courts/search/?court_id=12&date=YYYY-MM-DD&times=10:00,18:00&page=1 (Phase 5 Combined)
        ↓
  publicDiscoveryApi.searchPublicCourts()     omitAuth + skipAuthRefresh
        ↓
  publicDiscovery.mappers.ts                  Backend item → DiscoveryCourt (incl. matchingTimes)
        ↓
  usePublicCourtDiscovery()                   loading · error · ready, retry, loadMore, runSearch, clearSearch
                                              (called on every filter change; previous request aborted)
        ↓
  DiscoveryCourtList → DiscoveryCourtCard / DiscoveryMatchedCourtCard → buildPublicCourtSchedulePath()
```

Backend field names are read only in `publicDiscovery.types.ts` (`PublicCourtDiscoveryItemResponse`) and `publicDiscovery.mappers.ts`. If the live contract differs when Backend lands, adapt those two files; the hook and UI use `DiscoveryCourt` and `DiscoveryCourtOption`.

Approved contract item (DRF `{ count, next, previous, results }` envelope):

```json
{
  "court_id": 1,
  "court_name": "Testing Main Court",
  "club_slug": "testing",
  "club_name": "Testing Club",
  "governorate": "القاهرة",
  "city": "القاهرة",
  "address": "...",
  "image_url": "https://...",
  "matching_times": ["10:00", "18:00"]
}
```

Mapping rules: `image_url` is kept only when it is an absolute `http(s)` URL; anything else becomes `null`. `matching_times` (Phase 3) is sanitized and deduplicated into 24-hour `HH:MM` strings (`matchingTimes`), ignoring unrelated availability fields. The address line is `address`, followed by `city` and `governorate` only when not already part of it (never repeating a place name), or nothing at all. Items without a positive `court_id`, a `club_slug`, or a `court_name` are dropped because they cannot link to a schedule.

### Card, filter, and state rules

- **Filter Bar (`DiscoveryCourtList` + `DiscoveryCourtFilterSheet` + `DiscoveryFilterSheet`):**
  - Default browsing (`selectedCourt === null`, `selectedDate === null`, `activeSearch === null`) renders `[ اختار ملعب معين ]`, `[ اختار اليوم ]`, and `[ اختار المواعيد ]` only, and loads `GET /api/v1/public/courts/?page=1`. There is no `بحث` button and no clear-all button.
  - **Phase 4 Court selection (`اختار ملعب معين`):** opens `DiscoveryCourtFilterSheet` (`AppSheet`), loading real publicly discoverable Court options from `GET /api/v1/public/courts/?page=…` with its own loading, error + retry, empty, and `عرض ملاعب أكثر` pagination states. Courts are selected by stable Backend identity (`courtId` + `clubSlug`), never by display name. When two or more Courts share the same normalized `courtName` (e.g. `ملعب 1` across different Clubs), `clubName` is shown as secondary disambiguation text inside the selector only. Selecting a Court updates the trigger to the Court name (truncated visually when long while preserving the full accessible name), closes the sheet, and searches immediately. Selection is **single-select**: Backend search accepts one `court_id`, so picking another Court replaces the previous one. Multi-Court selection is blocked until Backend exposes a multi-Court filter parameter.
  - **Phase 2 Day selection (`اختار اليوم`):** opens `AppSheet` with a single-tap rolling 7-day strip and full month `DayPicker` calendar (`YYYY-MM-DD`).
  - **Phase 2 Time selection (`اختار المواعيد`):** depends on the selected day; if tapped before a day is selected, it prompts `اختار اليوم الأول عشان نعرض مواعيده` and transitions to time selection once a day is picked. Time slots reuse the Schedule morning/evening (`مواعيد الصباح` / `مواعيد المساء`) slot visual language and cap selection at 5 (`MAX_DISCOVERY_SELECTED_TIMES = 5`, disabling unselected slots when 5 are chosen). Changing the day clears selected times.
  - **Reactive search (no `بحث` button):** every Court, day, or time change, and every `مسح الاختيار`, immediately calls `GET /api/v1/public/courts/search/` with the remaining `court_id` (Phase 4) and/or `date` + `times` (Phase 2/3), or restores the default `GET /api/v1/public/courts/` browse when no Court or day remains. Changing the day keeps the Court, clears times, and searches the new day without the old times. Backend stays the availability authority; loaded Courts are never filtered locally.
  - **Race & loading safety:** `usePublicCourtDiscovery` aborts the previous request on every new query and ignores late responses, so an older response never overwrites newer results. Only the results area switches to `جاري تحميل الملاعب...` while loading; the filter bar and selected values stay, and previous results are never shown under new criteria. No debounce or timers.
  - **Selector sheets (`AppSheet` `footer` slot):** the Court, day, and times sheets share one structure: fixed header with `×`, a scrollable body (only the options scroll), and a sticky footer with one `مسح الاختيار` button (`DiscoveryClearSelectionButton`, Sloty light-yellow secondary, never red, no icon). It is always rendered and disabled when that selector is empty. Court: clears the Court. Day: clears the day and its times. Times: clears all times and keeps the day. Clearing keeps the sheet open and searches immediately. `×` only closes the sheet; it never clears, applies, or cancels.
  - **Phase 3 & Phase 4 Result Presentation:**
    - Time-filtered searches (`activeSearch.times.length > 0`) render `DiscoveryMatchedCourtCard`, showing the Court image, name, address, and `المواعيد المتاحة` (the Backend `matching_times` subset of requested times available at that Court).
    - Default browse, day-only searches, and Phase 4 Court-only searches render the simple `DiscoveryCourtCard` without `المواعيد المتاحة`.
  - Filtered results heading: `الملاعب المناسبة لمواعيدك` (day + times), `الملاعب المتاحة في اليوم المختار` (day-only), or `الملعب المختار` (Court-only).
  - There is no filter-bar `مسح الاختيارات` (clear-all). Each filter is cleared from its own sheet's `مسح الاختيار`; once no Court or day remains, the unfiltered Court list returns automatically.
- Cards show only the Backend **image**, **Court name**, and **address**. No ratings, reviews, prices, availability text, keyword badges, or location stuffing. The whole card is one link whose accessible name is the Court name.
- No image (or a failed image load) shows a neutral soft-mint placeholder with an icon, never a substitute photo or invented URL. The project had no shared image-fallback asset, so the placeholder uses design tokens only.
- States reuse the app's list pattern (`AppCard` with text, as in `CourtsListPage`; danger text plus `إعادة المحاولة`, as in `ProtectedRoute`). Only the Courts section changes state; the rest of the page always renders.
- **Loading:** `AppCard` with `role="status"` text `جاري تحميل الملاعب...`.
- **Error:** `تعذر تحميل الملاعب الآن. حاول مرة أخرى.` with `إعادة المحاولة` (`role="alert"`). It is never rendered as an empty list. This is also what visitors see while the endpoint is not live (404) or unreachable.
- **Empty:**
  - Unfiltered browse or Court-only search: `مفيش ملاعب متاحة حاليًا.`
  - Filtered day + times (no Court selected): `مفيش ملاعب متاحة في المواعيد دي حاليًا.`
  - Filtered day-only (no Court selected): `مفيش ملاعب متاحة في اليوم ده حاليًا.`
  - Filtered Court + day + times: `الملعب ده مش متاح في المواعيد دي حاليًا.`
  - Filtered Court + day-only: `الملعب ده مش متاح في اليوم ده حاليًا.`
- **Pagination:** `عرض ملاعب أكثر` appends the next DRF page while `next` is not null (retaining active `date` and `times` when filtered); a failed page keeps loaded Courts and shows `تعذر تحميل المزيد من الملاعب. حاول مرة أخرى.`
- Production runtime always calls the real endpoint. There are no sample Courts, fallback data, or cached Courts. Fixtures exist only in tests.

### Backend integration status

The frontend is implemented against the approved contract above. The endpoint is not yet live; until it is, `/` shows the error state. When Backend deploys, verify the live response against the mapper (field names, nullability, location code, image URL host) and adjust only the API/type/mapper boundary if needed.

---

## 5. Metadata strategy

Indexable pages emit, in order: `<title>`, `description`, `robots: index, follow`, one `canonical`, `og:type=website`, `og:site_name=Sloty`, `og:locale=ar_EG`, `og:title`, `og:description`, `og:url`, `og:image` (the existing `/icons/sloty-512x512.png`) + `og:image:alt`, `twitter:card=summary`, and one JSON-LD `@graph`.

| Page | Title | Description | H1 |
| :--- | :--- | :--- | :--- |
| `/` | `Sloty \| سلوتي لحجز وإدارة ملاعب كرة القدم` | `سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم، تساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد بسهولة.` | `سلوتي لحجز ملاعب كرة القدم` |
| `/about/` | `عن سلوتي \| Sloty` | `تعرّف على سلوتي (Sloty): منصة مصرية بدأت من أسيوط لتخلي إدارة ملاعب كرة القدم أبسط وأسهل لأصحاب الملاعب وفريق العمل.` | `عن سلوتي` |
| Public Schedule | `جدول مواعيد الملعب \| Sloty` | — (noindex) | Court name |
| Private routes | `Sloty \| سلوتي` | — (noindex) | Page title |

Titles and descriptions are unique per page and read from the same copy module as the visible headings. Category vocabulary (حجز ملاعب، ملاعب كرة القدم، مواعيد الملاعب، أصحاب الملاعب، فريق العمل …) appears only inside real sentences. Visible English is limited to the brand name Sloty; the English concept line lives only in JSON-LD.

Arabic is the only content language. There is no `hreflang`: no equivalent localized URLs exist.

---

## 6. Canonical URL rules

- **Source of truth:** `VITE_PUBLIC_SITE_URL` in [`.env.production`](../.env.production) (`https://sloty.baronlearning.com/`), normalized to a bare origin by `normalizePublicSiteOrigin()`. It is compiled into the client and read by the build plugin through `loadEnv`.
- The origin is **never** derived from `window.location`, request headers, or client state.
- `tests/deploy/seoPublicSiteUrl.test.ts` asserts it matches the deploy script's `SLOTY_PUBLIC_URL` health-check origin.
- A production build **fails** if the variable is missing or invalid, rather than shipping a sitemap for the wrong host. In dev and tests, a missing value omits canonical, `og:url`, `og:image`, and JSON-LD.
- Canonical paths are root-relative with a trailing slash for directories (`/`, `/about/`). Each indexable page has exactly one canonical.
- `dist/index.html` and `dist/about/index.html` carry their full head statically (canonical, robots, `og:url`, JSON-LD). Deep links never receive them: Nginx and Workbox fall back to `app.html` (section 7).

---

## 7. Crawlability and prerender

Sloty stays a Vite React SPA/PWA; no SSR framework was introduced. Public pages are **prerendered at build time**:

1. `seoBuildPlugin` runs in Vite's `generateBundle` (build only).
2. It starts a temporary Vite SSR server (`configFile: false`, middleware mode) and loads `src/app/seoPrerender.tsx`.
3. Each indexable page is rendered with `renderToString()` using **the same components** the client uses, inside a `MemoryRouter`.
4. The head from `buildSeoHeadTags()` replaces the template `<title>`, and the markup fills `#root` inside `<div data-sloty-prerender="<path>">`.
5. `index.html` is rewritten in place for `/`; `about/index.html`, `app.html` (clean SPA fallback), `robots.txt`, and `sitemap.xml` are emitted.

The prerendered discovery page contains the identity, the H1, the `ملاعب كرة القدم` section, the compact filter bar (`اختار اليوم` / `اختار المواعيد`), and the Court list **loading state**. Courts are never fetched at build time: the build must not depend on Backend availability and must never bake a stale or invented list into HTML. Real Courts render in the browser from the public API; Googlebot renders JavaScript and sees them. For that, the API host must stay fetchable by crawlers (do not disallow `/api/v1/public/` in the API host's `robots.txt`). On start-up, `createRoot()` replaces the prerendered markup (no hydration, no mismatch risk).

**Deep-link and PWA fallback safety.**
- Private and dynamic deep links (`/schedule`, `/login`, `/public/...`) are routed by Nginx (`try_files $uri $uri/ /app.html;`) and Workbox (`navigateFallback: 'app.html'`) to `dist/app.html`: `noindex, nofollow`, empty `#root`, no page-specific metadata.
- Installed PWA launches that start at `/` in standalone mode run a tiny inline guard script in `dist/index.html` that sets `data-sloty-prerender-hidden` on `<html>` before React boots, hiding the prerendered discovery markup.

Generation happens before `closeBundle`, so vite-plugin-pwa precaches the final `index.html`, `about/index.html`, and `app.html`. The discovery API is never cached by the service worker (no runtime caching; `/api` is outside the navigation fallback).

---

## 8. Structured data

| Page | JSON-LD `@graph` nodes |
| :--- | :--- |
| `/` | `Organization` (name `Sloty`, alternateName `سلوتي`, url, logo, identity `description`) · `WebSite` · `SoftwareApplication` (`applicationCategory: BusinessApplication`, `operatingSystem: Web`, Arabic description, English `disambiguatingDescription`) · `WebPage` |
| `/about/` | `AboutPage` (about `/#organization`, part of `/#website`) · `BreadcrumbList` (Sloty → عن سلوتي), matching the visible breadcrumb |

Nodes are linked by `@id` (`/#organization`, `/#website`). JSON is escaped so it can never close its `<script>`.

Deliberately **not** emitted: `LocalBusiness` or `SportsActivityLocation` for Sloty itself (Sloty is software, not a venue), Court or Club entities, `ItemList` of Courts, addresses, phone numbers, geo coordinates, opening hours, prices/offers, ratings, reviews, and customer counts. Tests fail if any of these appear. Court-level structured data is out of scope until a later phase introduces real Court pages.

---

## 9. robots.txt

Generated at build time (`buildRobotsTxt`), not stored in `public/`:

```text
User-agent: *
Allow: /

Sitemap: https://sloty.baronlearning.com/sitemap.xml
```

Everything is crawlable, including the JS/CSS needed to render. Private routes are **not** disallowed on purpose: a disallowed URL cannot be fetched, so crawlers would never see its `noindex`. robots.txt is not an authorization mechanism, and indexing policy is set only by the central SEO layer, never inside feature components.

---

## 10. sitemap.xml

Generated at build time (`buildSitemapXml`) from `indexablePublicPages`: `/` and `/about/` only, as absolute URLs on the canonical origin. `lastmod`, `changefreq`, and `priority` are omitted (a build timestamp is not a content modification date, and Google ignores the other two).

Never listed: private routes, `/login`, Public Schedule URLs, and Court or Club URLs. Courts are not added just because a public URL exists, and there is no dynamic Court sitemap.

---

## 11. Court pages

The Court destination is the existing guest Public Schedule, `/public/:clubSlug/courts/:courtId/schedule` (see [`features/public-schedule.md`](features/public-schedule.md)). It stays `noindex`: it is a date-dependent utility reached through discovery or a shared link/QR, not a search landing page.

There is no intermediate Court-detail page and no programmatic Court SEO (`/court-x/`, `/court-y/` …). Discovery → real Court → existing Public Schedule is the whole Court journey for now. Do not generate Court landing pages, Court sitemap entries, or Court structured data unless a later approved phase introduces them from real, publicly consented Backend data.

---

## 12. About and internal linking

`/about/` is intentionally minimal: one message and one primary CTA. It contains only a hero, `من نحن؟`, `ليه Sloty؟`, `مين Sloty ليه؟` (two audiences), `هدفنا`, `مجاني 100%` (product-confirmed: management is free, no subscription), and `عايز تبدأ مع Sloty؟` with the single `ابدأ مجانًا` button. There is no feature catalog, principles grid, or extra CTA. `ابدأ مجانًا` opens a tiny `AppSheet` (`ابدأ مع Sloty`) with two semantic links, `tel:` and `mailto:`, read from the shared `slotyContact` config ([`src/shared/config/contact.ts`](../src/shared/config/contact.ts)); there is no form. About is the only public page that tells the Assiut origin story (`أسيوط`); `/`, discovery, root metadata, root JSON-LD, and the sitemap stay geography-neutral. It does not list Courts or call the discovery API.

Internal links follow the real journey, with descriptive anchor text and no hidden or footer keyword links:

| From | To | Anchor |
| :--- | :--- | :--- |
| Discovery | Each real Court's Public Schedule | Court name |
| Discovery | `/about/` | `عن سلوتي` (card link and footer) |
| About | `/` | `Sloty` (breadcrumb), `الرئيسية` (footer) |
| Any public page | `/login` | `تسجيل الدخول` / `تسجيل الدخول لفريق العمل`, always `rel="nofollow"` |

---

## 13. Adding a public indexable page

1. Confirm the page has a distinct, useful role in the discovery hierarchy (no duplicate city or keyword pages).
2. Build it under `src/features/publicSite/` with `PublicSiteLayout`, using real content only.
3. Add its copy to `publicSite.copy.ts` and an `IndexablePageSeo` (unique title/description, canonical path, truthful JSON-LD) to `publicSite.seo.ts`.
4. Add it to `indexablePublicPages` and to `prerenderPages` in `src/app/seoPrerender.tsx` (TypeScript enforces the mapping).
5. Register the route with `handle: routeSeo(...)` in `src/app/router.tsx`.
6. Link to it from existing public pages with descriptive anchor text.
7. Extend `src/app/seoPrerender.test.tsx`, `src/app/App.test.tsx`, `src/app/router.test.tsx`, `publicSite.seo.test.ts`, and `tests/deploy/spaFallbackRouteContract.test.ts`, then update this document.

---

## 14. Player discovery phases

| Phase | Scope | Status |
| :--- | :--- | :--- |
| Phase 0 | Public discovery foundation: discovery at `/`, SEO hierarchy, About page | Complete |
| Phase 1 | Browse Courts: real Court list, cards, Public Schedule handoff | Complete |
| Phase 2 | Day + up to 5 Times filtering (`GET public/courts/search/`) | Complete |
| Phase 3 | Matching Courts + matching requested times (`matching_times`, `DiscoveryMatchedCourtCard`) | Complete |
| Phase 4 | Choose a specific Court (`اختار ملعب معين`, `DiscoveryCourtFilterSheet`, `court_id`) | Complete |
| Phase 5 | Combined Court + day/time filtering (`court_id` + `date` + `times`) | Complete |
| Phase 6 | Enhanced Schedule handoff (`?date=YYYY-MM-DD` and optional `&time=HH:MM`) | Implemented |
| Future | Player self-booking | Not implemented; public copy must not promise it |

Later phases extend `src/features/publicDiscovery/` and keep using this SEO system. Filtered or parameterized discovery views must not become new indexable URLs without an explicit decision recorded here.

---

## 15. Nginx host contract and operational notes

- **Routing.** The production server block must use:
  ```nginx
  location / {
      try_files $uri $uri/ /app.html;
  }
  ```
  - `/` serves `dist/index.html` (indexable discovery page).
  - `/about/` serves `dist/about/index.html` (indexable About page).
  - Private and dynamic deep links fall back to `/app.html` (noindex).
- **Search Console / Bing Webmaster.** Property verification and sitemap submission are operational tasks. No verification tokens or credentials belong in this repository.
- **Social image.** The square app icon is used (`twitter:card=summary`). A dedicated 1200×630 image can be added later as a real asset.

---

## 16. Verification

```bash
npm run build
# dist/index.html          discovery head (canonical /, robots index, JSON-LD) + prerendered identity, Courts heading, loading state
# dist/about/index.html    full head incl. canonical https://…/about/ and AboutPage JSON-LD
# dist/app.html            clean SPA fallback (noindex, nofollow, empty #root, no page metadata)
# dist/robots.txt, dist/sitemap.xml (only / and /about/)
```

After a production deploy:

```bash
curl -s https://sloty.baronlearning.com/robots.txt
curl -s https://sloty.baronlearning.com/sitemap.xml
curl -s https://sloty.baronlearning.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://sloty.baronlearning.com/ | grep -o '<meta name="robots"[^>]*>'
curl -s https://sloty.baronlearning.com/about/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://sloty.baronlearning.com/login | grep -o '<meta name="robots"[^>]*>'
# Live discovery contract (once Backend deploys):
curl -s 'https://api.sloty.baronlearning.com/api/v1/public/courts/?page=1'
```

Automated coverage: `src/core/seo/*.test.ts`, `src/app/seoPrerender.test.tsx` (real `index.html` template), `src/app/App.test.tsx` (runtime head per route and the anonymous discovery → Court → Public Schedule journey through the real router), `src/app/HomeRoute.test.tsx`, `src/app/router.test.tsx`, `src/features/publicSite/**`, `src/features/publicDiscovery/**`, `src/pwa/pwaConfig.test.ts`, `tests/deploy/seoPublicSiteUrl.test.ts`, `tests/deploy/spaFallbackRouteContract.test.ts`, and `tests/deploy/deploySlotyFrontend.test.ts`.

---

## 17. Non-goals

- No keyword stuffing, hidden text, or `<meta name="keywords">`.
- No duplicate city pages, keyword landing pages, or SEO article before the Courts.
- No invented Courts, Clubs, availability, addresses, image URLs, phones, ratings, reviews, prices, or customer counts, at runtime or as fallback data.
- No `LocalBusiness` schema for Sloty.
- No Backend changes or invented endpoints beyond the approved discovery contract.
- No SSR framework migration (Next.js, Remix, …).
- No changes to authenticated pages, offline sync, Public Schedule behavior, or release/version logic. `version.json` and the PWA manifest are never touched by the SEO build step.
