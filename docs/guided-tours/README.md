# Guided product tours

Amazon-style spotlight walkthroughs: an overlay dims the page, highlights one element
at a time with a popover explaining what it does, and the user advances only with
Next/Back. One tour per role, auto-started on a user's first visit to their landing
page, re-runnable anytime from the **?** help button beside the profile menu.

- Library: **driver.js 1.x** (MIT, ~5KB, framework-agnostic; react-joyride is broken
  on React 19, Onborda would add a framer-motion dependency).
- Per-role step content: [steps-super-admin.md](steps-super-admin.md) ·
  [steps-staff-admin.md](steps-staff-admin.md) · [steps-franchisee.md](steps-franchisee.md) ·
  [steps-ci.md](steps-ci.md)

## Tour keys and versioning

Each role has a **main tour** (shell + dashboard, listed first in its registry
list) plus **per-page mini-tours** that auto-start on the first visit to that
page.

| Key | Role | Runs on | Steps file |
|---|---|---|---|
| `super-admin-dashboard` | Superadmin | `/admin/dashboard` | steps-super-admin.md |
| `staff-admin-operations` | Regional (staff) admin | `/admin/operations` | steps-staff-admin.md |
| `franchisee-dashboard` | Operational franchisee | `/franchisee/dashboard` | steps-franchisee.md |
| `ci-dashboard` | Signed CI | `/ci/dashboard` | steps-ci.md |
| `admin-franchise-hub` | Superadmin | `/admin/franchise` | steps-pages-admin.md |
| `admin-students` | Superadmin | `/admin/students` | steps-pages-admin.md |
| `admin-ci-hub` | Superadmin | `/admin/course-instructors` | steps-pages-admin.md |
| `admin-operations-hq` | Superadmin | `/admin/operations` | steps-pages-admin.md |
| `admin-regional-operations` | Superadmin | `/admin/regional-operations` | steps-pages-admin.md |
| `admin-bulk-import` | Superadmin | `/admin/bulk-import` | steps-pages-admin.md |
| `admin-programs` | Superadmin | `/admin/programs` | steps-pages-admin.md |
| `admin-admins` | Superadmin | `/admin/admins` | steps-pages-admin.md |
| `franchisee-students` | Operational franchisee | `/franchisee/students` | steps-pages-franchisee.md |
| `franchisee-course-instructors` | Operational franchisee | `/franchisee/course-instructors` | steps-pages-franchisee.md |
| `franchisee-orders` | Operational franchisee | `/franchisee/orders` | steps-pages-franchisee.md |
| `ci-agreement` | Signed CI | `/ci/agreement` | steps-pages-ci.md |
| `ci-training` | Signed CI | `/ci/training` | steps-pages-ci.md |

The registry (`lib/tours/tour-registry.ts`) holds one frozen list per role —
`SUPER_ADMIN_TOURS`, `STAFF_ADMIN_TOURS`, `FRANCHISEE_TOURS`, `CI_TOURS` — with
the main tour first. `findTourForPage(tours, pathname)` resolves the current
page's tour by exact pathname match. The **? button** replays the current
page's tour when one exists, and otherwise falls back to the role's main tour
(navigating to its page first). Note superadmin and staff admin get *different*
tours on `/admin/operations` (`admin-operations-hq` vs `staff-admin-operations`)
via list membership.

Each tour has an integer `version` (starts at 1). A user's completion entry counts
only while `entry.version >= def.version` — **bump the version to re-show the tour to
everyone** after a change big enough that the old walkthrough would mislead: nav items
moved/renamed/added, a landing page restructured, a major widget added or removed.
Do NOT bump for copy tweaks or reordering of equivalent steps.

## Storage & API

Server-side, per user. Each user table (`admin`, `franchisee`, `course_instructor`)
carries `"toursCompleted" JSONB NOT NULL DEFAULT '{}'`:

```json
{ "franchisee-dashboard": { "version": 1, "completedAt": "2026-08-17T10:00:00.000Z" } }
```

Exposed on each realm's `/me` response. Marked complete via:

| Realm | Route |
|---|---|
| Admin | `POST /admin/auth/me/tours/complete` |
| Franchisee | `POST /franchisee/auth/me/tours/complete` |
| CI | `POST /ci/me/tours/complete` |

Body: `{ "tourKey": "<key>", "version": <int> }`. **Skipping counts as completing** —
one flag, no separate "skipped" state; the ? button always re-runs the tour.

**Fail-open rule:** a missing `toursCompleted` field (old backend, profile not loaded)
is treated as "completed" — the tour never auto-starts on uncertainty and never nags.
A failed completion POST is logged, not surfaced; an in-memory session flag stops the
tour from re-blocking the same session.

## Anchors

Tour steps target elements via CSS selectors with three conventions:

- `[data-tour="nav:<href>"]` — sidebar nav links; the attribute is derived from the
  nav item's `href` in `components/layout/portal-sidebar.tsx`, so
  `lib/navigation/nav-config.ts` stays the single source of truth. The registry unit
  test asserts every `nav:` anchor matches a real nav-config href.
- `[data-tour="tab:<value>"]` — `PageTabs` triggers (derived from the tab value in
  `components/shared/page-tabs.tsx`). Used by all tab-walking tours. The raw
  Radix tabs on `/franchisee/course-instructors` carry hand-added `tab:` anchors.
- `[data-tour="<kebab-id>"]` — page widgets (e.g. `dashboard-stats`); existing kit
  `data-testid`s are reused where they already exist (`agreement-hero`,
  `franchise-rail`, `user-menu-trigger`).
- `anchor: null` — a centered, element-less step (welcome / finish).

**Kit-wide anchors** (emitted automatically, usable on any page): `page-actions`
(PageHeaderCard actions slot — header CTA buttons), `page-tabs-list` (the tab
strip), `page-header-extras` (PageTabs headerExtras wrapper, e.g. the
regional-ops region select), `table-search` / `table-filters` / `table-actions`
(DataTable toolbar: search input, filter+sort row, toolbarActions cluster).

**Per-page one-offs**: `onboard-franchise`, `ci-training-subtabs`,
`procurement-subtabs`, `program-sections`, `bulk-import-tiles`,
`certificates-subtabs`, `orders-summary`, `receivables-summary`,
`ci-agreement-view`. Nested raw-Tabs strips get a single highlight step — never
a tab-walk.

**Toolbar-step ordering rule**: on tabbed pages, panels mount on first
activation and stay mounted (`forceMount` + `useVisitedTabs`), so a
`table-search`/`table-actions` selector can match a *hidden* panel's toolbar
once several tabs have been visited. Author toolbar steps immediately after
their tab's own step (before walking other tabs) AND give them the same `tab`
value, so Back-navigation re-activates the right tab before highlighting.
Because `querySelector` picks the FIRST match in DOM order, a shared toolbar
anchor must target the first-declared panel — true today on every toured page.

**Cross-tab steps**: steps that carry a `tab` always survive the start-time
presence filter, even when their anchor lives inside a not-yet-mounted (or
unmounted — some pages don't keep inactive panels) tab panel. The engine's
Next/Back handlers activate the TARGET step's tab and give the panel a frame
to mount before moving, with driver's per-step element wait (2.5s) +
`skipMissingElement` as the fallback for slow or genuinely absent anchors.

Steps whose anchor has no matching DOM element when the tour starts are silently
dropped (conditional widgets), and the step counter reflects the filtered list.

## Auto-start rules

A tour auto-starts only when ALL hold (applies to the main tour on the
dashboard AND to each page mini-tour on its own page — first visit to each
page auto-starts that page's tour, once per user per page):

1. Desktop viewport (≥768px — the sidebar collapses into a sheet below that; mobile
   gets no tour and no ? button in v1).
2. The user is on the tour's page (`def.page`, exact pathname match).
3. The user is eligible: superadmin / staff admin; franchisee with
   `isFranchiseOperational(user)`; CI with `agreementPhase === "SIGNED"`. Funnel
   users (franchisee pre-agreement, CI pre-signature) are excluded — their pages are
   already a single guided path.
4. Server tour state is **loaded** and the tour is not completed at the current version.
5. Not already started this browser session (guards strict-mode double effects and
   skip/finish re-triggers).
6. The readiness selector (`def.readyWhen`, e.g. a rendered stat cell) exists in the
   DOM — polled up to 8s so the tour never highlights skeletons.

The ? button bypasses 4 and 5 (always re-runnable) and navigates to `def.page` first
if the user is elsewhere.

## Forced interaction & skipping

driver.js config: `allowClose: false`, `disableActiveInteraction: true`,
`allowKeyboardControl: false`, overlay clicks do nothing — the ONLY ways forward are
the Next/Back buttons. A "Skip tour" link in the popover footer pauses the tour
(destroys the overlay), opens the kit `ConfirmDialog` ("Skip the tour? You can replay
it anytime from the ? button"), and either resumes at the same step (cancel) or marks
the tour complete (confirm). Finishing the last step marks it complete.

## Deploy

1. **Backend first**: run the three `*-add-tours-completed.sql` migrations on prod,
   deploy IPA-back. Additive — the old frontend ignores the new fields.
2. **Frontend second**: deploy Abacus.

Existing users have `toursCompleted = {}`, so **every current user sees their tour
once** on the next landing-page visit (skippable in one click). If that's unwanted,
ship a backfill migration marking version 1 complete for all pre-existing rows before
the FE deploy — decided: NOT backfilling; existing users have never seen a tour either.

## Adding a new tour later

1. Add a `TourDefinition` (in the role's page-tours file in `lib/tours/`) and
   append it to that role's list in `tour-registry.ts`. Set `tabs` if the page
   has tab anchors (the registry test validates `tab:` anchors against it).
2. Add any new `data-tour` widget anchors and list them in `KNOWN_WIDGET_ANCHORS`.
3. Add a steps table to the role's steps-pages doc and a row to the table above.
4. Nothing else — auto-start and the ? button resolve tours by pathname.
No backend change needed — the JSONB map accepts any new key.
