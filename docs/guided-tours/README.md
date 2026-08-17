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

| Key | Role | Runs on | Steps file |
|---|---|---|---|
| `super-admin-dashboard` | Superadmin | `/admin/dashboard` | steps-super-admin.md |
| `staff-admin-operations` | Regional (staff) admin | `/admin/operations` | steps-staff-admin.md |
| `franchisee-dashboard` | Operational franchisee | `/franchisee/dashboard` | steps-franchisee.md |
| `ci-dashboard` | Signed CI | `/ci/dashboard` | steps-ci.md |

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
  `components/shared/page-tabs.tsx`). Used by the staff-admin tab-walking tour.
- `[data-tour="<kebab-id>"]` — page widgets (e.g. `dashboard-stats`); existing kit
  `data-testid`s are reused where they already exist (`agreement-hero`,
  `franchise-rail`, `user-menu-trigger`).
- `anchor: null` — a centered, element-less step (welcome / finish).

Steps whose anchor has no matching DOM element when the tour starts are silently
dropped (conditional widgets), and the step counter reflects the filtered list.

## Auto-start rules

The tour auto-starts only when ALL hold:

1. Desktop viewport (≥768px — the sidebar collapses into a sheet below that; mobile
   gets no tour and no ? button in v1).
2. The user is on the tour's page (`def.page`).
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

1. Add a `TourDefinition` file in `lib/tours/` and register it in `tour-registry.ts`.
2. Add any new `data-tour` widget anchors and list them in `KNOWN_WIDGET_ANCHORS`.
3. Add a steps doc here and a row to the table above.
4. Wire its trigger (the ? button maps portal → tour in `hooks/use-guided-tour.ts`).
No backend change needed — the JSONB map accepts any new key.
