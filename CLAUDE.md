# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abacus Portal** — a Next.js 16 (App Router) franchise-management portal for IPA abacus-education centers. Three role portals with separate routing, layouts, and logins:

| Portal | Routes | Login | Notes |
|---|---|---|---|
| Admin (super/staff) | `/admin/**` | `/admin-login` | Hubs: franchise, students, course-instructors, operations (+ regional for super) |
| Franchisee | `/franchisee/**` | `/login` | Pre-active franchisees are gated into the agreement funnel at `/franchisee/agreement` |
| Course Instructor | `/ci/**` | `/ci/login` | Pre-signature CIs are gated into `/ci/agreement` (header-only shell) |

## Commands

```bash
npm run dev          # dev server (default :3000 — IPA-back CORS allows only this origin)
npm run build        # production build (requires NEXT_PUBLIC_API_URL; see check-env)
npm run lint         # eslint — MUST be 0 errors (guardrail rules are error-level)
npx tsc --noEmit     # typecheck (rm -rf .next first after route moves)
npm run test         # vitest unit suite
npm run test:e2e     # playwright smoke; PLAYWRIGHT_BASE_URL overrides :3000
npm run check:ui     # grep-based UI-consistency snapshot check (scripts/)
```

E2e note: `reuseExistingServer` latches onto whatever runs on :3000 — if another project holds the port, pass `PLAYWRIGHT_BASE_URL=http://localhost:<port>` against your own dev server. The authenticated e2e slice (`tests/e2e/authenticated.test.ts`) is env-gated via `E2E_*_USER/PASS` and needs the real backend.

This project uses **npm** (`package-lock.json`). The backend is IPA-back (NestJS) on `:5500`; `NEXT_PUBLIC_API_URL` points at it (validated by `lib/config.ts`).

## Design system — read this first

The UI is a **kit-first design system** (navy `#04346e` primary, yellow accent, semantic soft status tints). **`docs/design-system.md` is the component inventory and the rules digest** — check it before building any UI. The full specs live in `<repo-root>/../docs/fe-revamp/` (13 docs, change-IDs like ADM-08/FR-21/CC-12).

Non-negotiables (lint- or review-enforced):

- **Layering (PORT-01):** `components/ui` (shadcn primitives) and `components/shared` + `components/error` (the kit) NEVER import `@/services`, `@/hooks/api`, `@/context`, or `@/app` — eslint blocks it. Data enters kit components via props. Domain components live in `components/<domain>/` and route `_components/`.
- **Dialogs:** `AppDialog` / `FormDialog` / `DetailDialog` / `ConfirmDialog` / `MultiStepDialog` from `components/shared/dialog` — raw `ui/dialog` and `ui/alert-dialog` imports fail lint (two sanctioned inline-disabled exemptions exist).
- **Formatting authorities:** dates via `lib/date-utils` (`formatDate` → "15 Jan 2025"; `toLocaleDateString` and date-fns `format` are banned outside it); money via `lib/currency-utils` (`formatRupees`, `RUPEE_SYMBOL` — raw `₹` literals fail lint).
- **Status pills:** `StatusBadge` with a bare label; tones resolve from the shared label map. No local badge components, no raw palette classes (`bg-green-100` etc. — `check:ui` snapshots the burn-down list).
- **Lists:** `DataTable` from `@/components/shared` with the R7 `error`/`onRetry`/`emptyState` props; URL-persisted list state via `hooks/use-list-params` (prefix-namespaced on multi-list pages).
- **Headers:** one per page — `PageTabs` for hubs, `TablePageShell` for lists (`embed` inside tabs), `PageHeaderCard embedded` for dashboards. Empty values render `—` (DetailField normalizes).
- **Confirms:** irreversible actions through `ConfirmDialog` (`window.confirm` fails lint).

## File layout conventions (RT-07)

- Page-scoped code lives in the route's **`_components/`** private folder (never `components/` or `sections/` under `app/`).
- **`@/app/*` imports are banned** (lint): import relatively within a route, or promote the module to `components/`.
- New files are **kebab-case**; no new `index.ts` barrels (vitest coverage excludes them).
- Navigation is data-driven: `lib/navigation/nav-config.ts` (frozen constants + `isNavItemActive`; unit-tested). The shell is `components/layout/portal-shell.tsx` (+ sidebar/breadcrumbs/header-actions).
- Legacy URLs live in `next.config.mjs redirects()` (25 entries, 307) — never as stub pages. Auth pages share `app/(auth)/` + `components/auth/auth-page-frame.tsx`.

## Architecture

- **Data fetching:** TanStack Query v5. Query hooks live in `hooks/api/*.hooks.ts` with keys from `hooks/api/query-keys.ts`; services in `services/*.service.ts` call the shared `api` axios instance (`lib/axios.ts`, `withCredentials: true`) — do not create new axios instances.
- **Auth:** cookie sessions + a `"user"` localStorage record hydrated by `UserProvider` (`context/user-context`); CI portal has its own `CIAuthProvider`. Gating (pre-active franchisee funnel, pre-signature CI, `mustChangePassword`) is byte-identical logic — never alter it for presentation work.
- **Forms:** React Hook Form + zod for new forms; several legacy modals are deliberately unconverted (deferred).
- **Notifications:** SSE via `hooks/use-notification-sse.ts` → `NotificationBell` (`components/layout/`).
- **Payments:** Razorpay checkout (orders, agreement fees, CI receivables). Payment and signing flows are under a **byte-identical constraint** — chrome may change, handlers/payloads may not.

## Testing expectations

- Every phase-sized change ends green on: lint 0 errors · tsc · `npm run test` · build. e2e for nav/route changes.
- Date/₹ assertions in tests use the **formatter-import pattern** (`expect(screen.getByText(formatDate(iso)))`) — never hardcode formatter output.
- New kit components ship with `data-testid` (kebab-case root) and an exported props interface.

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Abacus**. Use the GitNexus MCP tools when available to understand code, assess impact, and navigate safely; if the MCP server is not connected, approximate impact analysis with targeted grep (find all consumers before editing shared symbols such as `StatusBadge`, `DataTable`, `AdminOrdersTable`, `StudentsTable`) and state the blast radius before high-fan-in edits.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze`.

- Run impact analysis (or the grep equivalent) before editing shared/kit symbols; warn on high-fan-in changes.
- Never rename symbols with bare find-and-replace across the repo; verify with `tsc` after every move (it is the completeness oracle).
- Skill files under `.claude/skills/gitnexus/` cover exploring, impact analysis, debugging, refactoring, and the CLI.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Abacus** (6035 symbols, 17849 relationships, 293 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Abacus/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Abacus/clusters` | All functional areas |
| `gitnexus://repo/Abacus/processes` | All execution flows |
| `gitnexus://repo/Abacus/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
