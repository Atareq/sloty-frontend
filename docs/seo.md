# SEO (Phase 1)

This document is the canonical reference for how the Sloty frontend presents itself to search engines and social scrapers. It describes the implemented Phase 1 foundation, the rules for extending it, and what is intentionally not built yet.

---

## 1. SEO identity

Every public signal (titles, headings, descriptions, structured data, internal links) describes one entity:

> **Sloty | سلوتي** — an Egyptian platform for booking and managing football pitches and sports facilities, starting with **Assiut (أسيوط)**.

Canonical Arabic statement (rendered on the homepage and used in JSON-LD):

```text
سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم والمرافق الرياضية، تبدأ من أسيوط، وتساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد والمدفوعات.
```

English concept (rendered with `lang="en"` and used as `disambiguatingDescription`):

```text
Sloty is an Egyptian platform for booking and managing football pitches and sports facilities, starting with Assiut.
```

Public copy must stay true to the shipped product. Players **view** public availability and contact the court to confirm; they cannot self-book yet. Owners and staff manage bookings, deposits, payments, working hours, and custody. All copy lives in [`src/features/publicSite/publicSite.copy.ts`](../src/features/publicSite/publicSite.copy.ts).

---

## 2. Routes and indexing policy

### Indexable public routes

| Route | Canonical URL | Page | Static file |
| :--- | :--- | :--- | :--- |
| `/` | `https://sloty.baronlearning.com/` | `PublicHomePage` (via `HomeRoute`) | `dist/index.html` |
| `/assiut/` | `https://sloty.baronlearning.com/assiut/` | `AssiutPage` | `dist/assiut/index.html` |

These two routes are the complete list registered in `indexablePublicPages` ([`publicSite.seo.ts`](../src/features/publicSite/publicSite.seo.ts)). They are also the only URLs in `sitemap.xml`.

`/` is shared with the authenticated app: [`HomeRoute`](../src/app/HomeRoute.tsx) renders the public homepage only for visitors **without a session in a normal browser tab**. Signed-in users, session hydration/errors, and installed-PWA launches keep the existing role-aware `AuthLandingRedirect` (a signed-out standalone launch still goes straight to `/login`).

The router matches `/assiut` with or without the trailing slash; links and canonicals always use `/assiut/`.

### Non-indexable routes (rule)

Any route **without** `handle: routeSeo(...)` in [`src/app/router.tsx`](../src/app/router.tsx) inherits `privateAppSeo`:

```html
<title>Sloty | سلوتي</title>
<meta name="robots" content="noindex, nofollow">
```

and no description, canonical, Open Graph, or JSON-LD. This covers `/login`, `/select-club`, every `AppShell` route (`/schedule`, `/dashboard`, `/bookings`, `/transactions`, `/settlements/**`, `/settings/**`, `/audit-logs`, `/admin/**`), and any future route that forgets to declare SEO. New private routes are safe by default.

The guest Public Schedule (`/public/:clubSlug/courts/:courtId/schedule`) is **public but noindex** in Phase 1 (`publicScheduleSeo`, title `جدول مواعيد الملعب | Sloty`): it is a link/QR-shared utility page with date-dependent availability and numeric IDs, and it will be superseded by canonical Club/Court entity pages (section 12).

Authentication, not robots directives, protects private data. `noindex` only keeps application screens out of results.

---

## 3. Architecture: one SEO system

```text
Route table (src/app/router.tsx)
  handle: routeSeo(homePageSeo | assiutPageSeo | publicScheduleSeo)   ← or nothing → privateAppSeo
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
| [`src/core/seo/seoHead.ts`](../src/core/seo/seoHead.ts) | `buildSeoHeadTags()` — the only place deciding which tags a page emits; HTML serialization and JSON-LD escaping |
| [`src/core/seo/seoDocument.ts`](../src/core/seo/seoDocument.ts) | `applyDocumentSeo()` — replaces every `[data-sloty-seo]` head tag on navigation |
| [`src/core/seo/SeoRouteBoundary.tsx`](../src/core/seo/SeoRouteBoundary.tsx) | Root layout route; resolves `handle.seo` from `useMatches()` |
| [`src/core/seo/seoRoute.ts`](../src/core/seo/seoRoute.ts) | `routeSeo()` helper and `resolveRouteSeo()` (deepest handle wins, default `privateAppSeo`) |
| [`src/core/seo/seoConfig.ts`](../src/core/seo/seoConfig.ts) | Brand names, OG locale/image, managed-tag marker, `privateAppSeo` |
| [`src/core/seo/publicSiteOrigin.ts`](../src/core/seo/publicSiteOrigin.ts) | Canonical origin from `VITE_PUBLIC_SITE_URL` |
| [`src/core/seo/seoStaticFiles.ts`](../src/core/seo/seoStaticFiles.ts) | `robots.txt`, `sitemap.xml`, HTML template injection, deep-link guard |
| [`src/core/seo/seoBuildPlugin.ts`](../src/core/seo/seoBuildPlugin.ts) | Build-only Vite plugin (Node) |
| [`src/app/seoPrerender.tsx`](../src/app/seoPrerender.tsx) | SSR entry rendering public pages and returning all static SEO files |
| [`src/features/publicSite/`](../src/features/publicSite/) | Public pages, layout, copy, SEO definitions and JSON-LD |

Rules:

- Pages never set `document.title` or head tags. Declare SEO on the route.
- Never add `<meta name="keywords">`.
- Public pages reuse the canonical `PageHeader` (its title is the page H1), `AppCard`, and `getAppButtonClassName()` for button-styled links.

---

## 4. Metadata strategy

Indexable pages emit, in order: `<title>`, `description`, `robots: index, follow`, one `canonical`, `og:type=website`, `og:site_name=Sloty`, `og:locale=ar_EG`, `og:title`, `og:description`, `og:url`, `og:image` (the existing `/icons/sloty-512x512.png`) + `og:image:alt`, `twitter:card=summary`, and one JSON-LD `@graph`.

| Page | Title | H1 |
| :--- | :--- | :--- |
| `/` | `Sloty \| سلوتي لحجز وإدارة ملاعب كرة القدم في أسيوط ومصر` | `إدارة وحجز الملاعب بسهولة مع Sloty` |
| `/assiut/` | `حجز ملاعب كرة القدم في أسيوط \| Sloty` | `ملاعب كرة القدم والحجز في أسيوط` |

Titles and descriptions are unique per page and read from the same copy module as the visible headings. Vocabulary (حجز ملاعب، إدارة الملاعب، مواعيد الملاعب، أصحاب الملاعب، فريق العمل …) appears only inside real sentences. Visible copy uses the correct spelling `أسيوط`; transliterations `Assiut`/`Asyut` appear only as the city's `alternateName` in JSON-LD and one natural English line.

Arabic is the only content language. There is no `hreflang`: no equivalent localized URLs exist.

---

## 5. Canonical URL rules

- **Source of truth:** `VITE_PUBLIC_SITE_URL` in [`.env.production`](../.env.production) (`https://sloty.baronlearning.com/`), normalized to a bare origin by `normalizePublicSiteOrigin()`. It is compiled into the client and read by the build plugin through `loadEnv`.
- The origin is **never** derived from `window.location`, request headers, or client state.
- `tests/deploy/seoPublicSiteUrl.test.ts` asserts it matches the deploy script's `SLOTY_PUBLIC_URL` health-check origin.
- A production build **fails** if the variable is missing or invalid, rather than shipping a sitemap for the wrong host. In dev and tests, a missing value just omits canonical, `og:url`, `og:image`, and JSON-LD.
- Canonical paths are root-relative with a trailing slash for directories (`/`, `/assiut/`). Each indexable page has exactly one canonical.
- **`/` exception:** `dist/index.html` is also the SPA fallback for every deep link (Nginx `try_files … /index.html` and Workbox `navigateFallback: 'index.html'`). It therefore ships **without** `canonical`, `og:url`, and `robots`, so `/login`, `/schedule`, or a shared `/public/...` link never claims to be the homepage (Facebook/LinkedIn would otherwise resolve deep-link shares to `/`). The runtime SEO layer adds all three for `/` after the app starts; Googlebot renders JavaScript and sees them. `dist/assiut/index.html` is a dedicated file and carries its full head statically.

---

## 6. Crawlability and the prerender decision

Sloty stays a Vite React SPA/PWA; no SSR framework was introduced. The smallest reliable approach is **build-time static prerendering of the public pages**:

1. `seoBuildPlugin` runs in Vite's `generateBundle` (build only).
2. It starts a temporary Vite SSR server (`configFile: false`, middleware mode) and loads `src/app/seoPrerender.tsx`.
3. Each indexable page is rendered with `renderToString()` using **the same components** the client uses, inside a `MemoryRouter`.
4. The head from `buildSeoHeadTags()` replaces the template `<title>`, and the markup fills `#root` inside `<div data-sloty-prerender="<path>">`.
5. `index.html` is rewritten in place with full static SEO for `/`; `assiut/index.html`, `app.html` (clean SPA fallback), `robots.txt`, and `sitemap.xml` are emitted.

Crawlers and non-JS scrapers receive real headings, paragraphs, links, metadata, and JSON-LD on public URLs. On start-up, `createRoot()` replaces any prerendered markup, so the client app is unchanged (no hydration, no mismatch risk).

**Deep-link and PWA fallback safety.**
- Private deep links (such as `/schedule` or `/login`) are routed by Nginx (`try_files $uri $uri/ /app.html;`) and Workbox (`navigateFallback: 'app.html'`) to `dist/app.html`. `app.html` contains `noindex, nofollow`, clean empty `#root`, and zero homepage titles, descriptions, or JSON-LD.
- Installed PWA launches that start at `/` in standalone mode run a tiny inline guard script in `dist/index.html` that sets `data-sloty-prerender-hidden` on `<html>` before React boots, hiding the prerendered PublicHomePage body so standalone staff launches never flash homepage content.

Because generation happens before `closeBundle`, vite-plugin-pwa builds the service-worker precache from the final HTML: `index.html`, `assiut/index.html`, and `app.html` are precached with correct revisions and open offline.

---

## 7. Structured data

| Page | JSON-LD `@graph` nodes |
| :--- | :--- |
| `/` | `Organization` (name `Sloty`, alternateName `سلوتي`, url, logo, description, `areaServed` Assiut, Egypt) · `WebSite` · `SoftwareApplication` (`applicationCategory: BusinessApplication`, `operatingSystem: Web`, Arabic description, English `disambiguatingDescription`) · `WebPage` |
| `/assiut/` | `WebPage` (about `City` أسيوط / Assiut / Asyut in `Country` مصر / Egypt) · `BreadcrumbList` (Sloty → أسيوط), matching the visible breadcrumb |

Nodes are linked by `@id` (`/#organization`, `/#website`). JSON is escaped so it can never close its `<script>`.

Deliberately **not** emitted: `LocalBusiness` or `SportsActivityLocation` for Sloty itself (Sloty is software, not a venue), addresses, phone numbers, geo coordinates, opening hours, prices/offers, ratings, reviews, and customer counts. Tests fail if any of these appear. The absence of `offers` and ratings means no software rich result; that is accepted over inventing data.

---

## 8. robots.txt

Generated at build time (`buildRobotsTxt`), not stored in `public/`:

```text
User-agent: *
Allow: /

Sitemap: https://sloty.baronlearning.com/sitemap.xml
```

Everything is crawlable, including the JS/CSS needed to render. Private routes are **not** disallowed on purpose: a disallowed URL cannot be fetched, so crawlers would never see its `noindex`. robots.txt is not an authorization mechanism.

---

## 9. sitemap.xml

Generated at build time (`buildSitemapXml`) from `indexablePublicPages`. It contains only `/` and `/assiut/`, as absolute URLs on the canonical origin. `lastmod`, `changefreq`, and `priority` are omitted: a build timestamp is not a content modification date, and Google ignores the other two. Private routes, public schedules, and Club/Court URLs are never listed.

---

## 10. Assiut local strategy

Assiut is Sloty's first real market, so it is the only local page. `/assiut/` explains, in natural Arabic:

- how players find available times (ask the court for its schedule link or QR, pick a day, contact the court to confirm);
- that the public schedule shows only `متاح` / `غير متاح` with no customer data;
- that Sloty is a full management system for owners and staff, not only a player booking page.

It lists **no** clubs, courts, or availability because there is no public Backend listing, and it must never show invented venues or times. Homepage ↔ Assiut are connected by the intro CTA, a dedicated card link, the footer navigation, and the visible breadcrumb, all with descriptive anchor text. Login links are `rel="nofollow"`.

No other city pages exist. Add a city only when there is real public data for it.

---

## 11. Adding a public indexable page

1. Build the page under `src/features/publicSite/` with `PublicSiteLayout`, using real content only.
2. Add its copy to `publicSite.copy.ts` and an `IndexablePageSeo` (unique title/description, canonical path, truthful JSON-LD) to `publicSite.seo.ts`.
3. Add it to `indexablePublicPages` and to `prerenderPages` in `src/app/seoPrerender.tsx` (TypeScript enforces the mapping).
4. Register the route with `handle: routeSeo(...)` in `src/app/router.tsx`.
5. Link to it from existing public pages with descriptive anchor text.
6. Extend the tests in `src/app/seoPrerender.test.tsx`, `src/app/App.test.tsx`, and `publicSite.seo.test.ts`, then update this document.

---

## 12. Future Club/Court SEO (not implemented)

```text
Sloty
├── Assiut                              /assiut/
├── Club public pages                   /clubs/{club_slug}/
└── Court public pages                  /clubs/{club_slug}/courts/{court_slug-or-id}/
```

Each future page must come from real, publicly consented Backend data and provide the real entity name, location, sport/court type, public schedule/availability where allowed, the public booking path once player booking exists, and appropriate local/sports entity structured data (for example `SportsActivityLocation` for a real venue, never for Sloty itself).

Prerequisites before starting: a public Backend contract for listing clubs/courts with slugs and location, a product decision on which clubs opt into search exposure, a sitemap strategy for dynamic URLs (build-time or server-generated), and a decision on whether `/public/.../schedule` redirects or canonicalizes to the court page. No such endpoint exists today; do not invent one.

---

## 13. Nginx host contract and operational notes

- **Dedicated SPA fallback (`app.html`).** Dynamic and private SPA deep links (`/login`, `/dashboard`, `/schedule`, `/settlements/**`, etc.) fall back to `dist/app.html`, which carries `noindex, nofollow`, clean empty `#root`, and zero homepage-specific metadata. Search crawlers requesting any private URL never receive homepage metadata before JavaScript boots.
- **Nginx routing configuration.** The production server block must use:
  ```nginx
  location / {
      try_files $uri $uri/ /app.html;
  }
  ```
  - `/` matches directory and serves `dist/index.html` (dedicated indexable homepage with canonical, robots: index, follow, and JSON-LD).
  - `/assiut/` matches directory and serves `dist/assiut/index.html` (dedicated indexable landing page).
  - Dynamic / private SPA deep links fail `$uri` and `$uri/` and fall back to `/app.html`.
- **Search Console / Bing Webmaster.** Property verification and sitemap submission are operational tasks. No verification tokens or credentials belong in this repository.
- **Social image.** The square app icon is used (`twitter:card=summary`). A dedicated 1200×630 image can be added later as a real asset.

---

## 14. Verification

```bash
npm run build
# dist/index.html          dedicated homepage head (incl. canonical, robots: index, follow) + prerendered markup
# dist/assiut/index.html   full head incl. canonical https://…/assiut/
# dist/app.html            clean generic SPA fallback (robots: noindex, nofollow, empty #root, no homepage tags)
# dist/robots.txt, dist/sitemap.xml
```

After a production deploy:

```bash
# Verify static discovery files
curl -s https://sloty.baronlearning.com/robots.txt
curl -s https://sloty.baronlearning.com/sitemap.xml

# Verify homepage indexability & canonical
curl -s https://sloty.baronlearning.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://sloty.baronlearning.com/ | grep -o '<meta name="robots"[^>]*>'
curl -s https://sloty.baronlearning.com/ | grep -o '<h1[^>]*>[^<]*</h1>'

# Verify Assiut indexability & canonical
curl -s https://sloty.baronlearning.com/assiut/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://sloty.baronlearning.com/assiut/ | grep -o '<meta name="robots"[^>]*>'

# Verify private SPA routes fall back to noindex app.html without homepage metadata
curl -s https://sloty.baronlearning.com/login | grep -o '<meta name="robots"[^>]*>'
curl -s https://sloty.baronlearning.com/schedule | grep -o '<meta name="robots"[^>]*>'
```

Automated coverage: `src/core/seo/*.test.ts`, `src/app/seoPrerender.test.tsx` (real `index.html` template), `src/app/App.test.tsx` (runtime head per route through the real router), `src/app/HomeRoute.test.tsx`, `src/app/router.test.tsx`, `src/features/publicSite/**`, `src/pwa/pwaConfig.test.ts`, `tests/deploy/seoPublicSiteUrl.test.ts`, `tests/deploy/spaFallbackRouteContract.test.ts`, and `tests/deploy/deploySlotyFrontend.test.ts`.

---

## 15. Non-goals

- No keyword stuffing, hidden text, or `<meta name="keywords">`.
- No fake city pages or dozens of keyword landing pages.
- No invented clubs, courts, availability, addresses, phones, ratings, reviews, prices, or customer counts.
- No `LocalBusiness` schema for Sloty.
- No Backend changes or new endpoints.
- No SSR framework migration (Next.js, Remix, …).
- No changes to authenticated pages, offline sync, or release/version logic. `version.json` and the PWA manifest are never touched by the SEO build step.
