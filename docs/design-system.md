# IPA Design System — kit inventory & adoption guide

> PORT-05 (docs/fe-revamp/11). The reference page for every reusable UI
> export in this repo and the recipe a future IPA app follows to consume
> them. Specs live in the FE-revamp doc suite (`../docs/fe-revamp/` in the
> project root); this page is the index.

## 1 · Principles digest (from doc 00)

- **Navy is the brand** (`#04346e`); yellow is the active/attention accent;
  status colors are semantic soft tints (success/warning/destructive/info),
  never raw palette classes.
- **One header per page** (R6). Hubs use `PageTabs`; simple list pages use
  `TablePageShell`; dashboards use `PageHeaderCard embedded`.
- **Attention chips, not trends** (R4): pending work renders as an amber
  count chip deep-linking to its queue; zero renders nothing; trend arrows
  are banned.
- **Freshness** (R5): dashboards show `LastUpdated` + a refresh action.
- **Action overflow** (R1): rows show at most Eye + one state action inline;
  everything else in a `…` menu, destructive item last.
- **Confirms** (R2): irreversible actions go through `ConfirmDialog`.
- **Detail surfaces** (R3): record peek = right Sheet; document flow
  (sign/pay/invoice) = wide `AppDialog`.
- **Error/empty copy** (R7): errors read "Couldn't load ⟨domain⟩." with a
  Retry; empties are domain-specific with guidance. A failed fetch must
  never masquerade as "no data".
- **One empty-value glyph**: `—` (em dash) — `DetailField` normalizes
  null/"" itself; never pass `"-"`/`"N/A"`.
- **Three label levels** (CC-02): section heading
  `text-[11px] font-semibold uppercase tracking-[0.08em]`, field label
  `text-xs text-muted-foreground`, micro label
  `text-[10px] font-semibold uppercase tracking-widest`.

## 2 · Tokens

Two portable artifacts (PORT-02):

| Artifact | Contents |
|---|---|
| `tailwind.preset.ts` | Every color read (`hsl(var(--x) / <alpha-value>)`), radius, font stacks, keyframes |
| `app/globals.css` between `/* ── design tokens: BEGIN ── */` and `END` | The HSL channel values themselves (light theme; dark mode = one future `.dark {}` block) |

Full token tables: doc `01-foundations`. Never hardcode hex or palette
classes — `npm run check:ui` snapshots offenders.

## 3 · Kit inventory (L1/L2 — the portable layers)

Layering contract (PORT-01): `components/ui` (L1 shadcn primitives) and the
L2 kit below **never import** `@/services`, `@/hooks/api`, `@/context`, or
`@/app` — enforced by lint (PORT-04). Data enters via props.

### Page shells & structure — `components/shared`

| Export | Use for |
|---|---|
| `TablePageShell` (+`embed`) | Standard list-page header card + content stack; `embed` for tab sections |
| `PageTabs`, `TabsContent` | Hub pages with `?tab=` sub-screens (pair with `useTabFromUrl`); `headerExtras` slot for stat bands/filters |
| `PageHeaderCard` | Dashboard/standalone headers (`embedded` variant for composite cards) |
| `TableSectionSurface`, `TableToolbarPanel`, `RawTableSurface` | Section chrome inside shells; `RawTableSurface` frames sanctioned `ui/table` uses |

### Lists & tables

| Export | Use for |
|---|---|
| `DataTable` | THE list table: search (`initialSearchValue`), filters, sort, pagination, expandable rows, loading skeletons, `error`/`onRetry` branch (R7), `emptyState` |
| `ItemsTable<T>` | Embedded item grids inside expanded rows/dialogs |
| `TableMainCell` | Main-column cell (title + muted subtitle) |
| `RowActionButton` | The ghost icon row action (tooltip + busy spinner) |
| `LineItemsList` | Label/qty/amount line lists in invoices/details |

### Status, money, dates

| Export | Use for |
|---|---|
| `StatusBadge` (+`resolveStatusTone`, `formatStatusLabel`, `OnFileBadge`, `StatusTone`) | Every status pill — bare label in, tone resolved by the shared map |
| `MoneyCell`, `GstTooltip` | Amount cells with optional GST breakdown tooltip |
| `GstAmount` | "₹X + 18% GST" / "incl." sublines (`lib/gst` owns the rate label) |
| `lib/currency-utils` | `formatRupees`, `formatCurrencyAmount`, `RUPEE_SYMBOL` — the only place ₹ lives |
| `lib/date-utils` | `formatDate` ("15 Jan 2025"), `formatDateTime`, `formatMonthYear`, `formatTimelineDate`, `formatLastUpdated`, `calculateAge` |

### Dashboards

| Export | Use for |
|---|---|
| `StatCell` | KPI cell; `pendingChip` (amber, renders only >0) + `alertChip` (red) — NO trend props by design |
| `QuickAccessCard` | Icon + title + count link cards (`count: undefined` hides — never fake 0) |
| `DashboardPanel`, `ModulePill`, `LastUpdated` | Panel card, eyebrow pill, freshness row |
| `SummaryStatCard`, `SummaryStatGrid` | Banded stat strips (detail headers, KPI rows) |

### Detail & profile kit

| Export | Use for |
|---|---|
| `ExpandedDetailSurface/Section`, `DetailFieldsGrid`, `DetailField`, `DetailCard`, `DetailMessage`, `DetailSubheading` | Expanded-row/detail layouts; `DetailField` renders `—` for empty |
| `FactCell`, `Timeline` (+`TimelineStop`) | Micro fact tiles; lifecycle/EMI dot timelines (overdue = destructive) |
| `components/shared/profile`: `IdentityHeader`, `ContactPill(Grid)`, `KeyFactCard(Grid)`, `ProfileCard(Section)`, `LabeledValue`, `EqualHeightRow`, `AvatarMonogram` | Profile/identity surfaces |

### Dialogs — `components/shared/dialog`

| Export | Use for |
|---|---|
| `AppDialog` (+Header/Body/Footer, `modal` passthrough) | Any single-page dialog; wide document flows (R3) |
| `FormDialog` | Single-step forms (submit/cancel footer, RHF-friendly) |
| `DetailDialog` | Read-only record dialogs |
| `ConfirmDialog` | R2 confirms (destructive variant) |
| `MultiStepDialog` (+`DialogStepper`, `FormSection`) | 3+ step dialog flows |
| `SuccessDialog`, `DialogStateMessage`, `DialogProgressCard` | Outcome/status states |
| `DialogFormField`, `DialogFormGrid` | Label+control chrome inside dialog bodies |
| `PickerSearch`, `LinkPicker`, `EntityLinkPicker<TCatalog,TAssigned>` | In-dialog search/pick lists |
| Raw `ui/dialog` | Banned by lint; the two sanctioned exemptions carry inline eslint-disables |

### States & errors

| Export | Use for |
|---|---|
| `EmptyState` | Domain empties (`{title, hint?, action?}`) |
| `TableSkeleton`, `PageSkeleton`, `StatCardSkeleton`, `StatGridSkeleton`, `CardListSkeleton` | Loading placeholders (never full-page spinners) |
| `components/error`: `RouteErrorState`, `ComponentErrorBoundary` | Route `error.tsx` bodies (telemetry event names preserved) and component-level boundaries |

### Generic hooks & steppers

| Export | Use for |
|---|---|
| `hooks/use-list-params` | URL-persisted list state (`q`/`page`/`sort`/filters, prefix namespacing, page-reset-on-filter) |
| `hooks/use-tab-from-url` | `?tab=` state without router churn |
| `hooks/use-visited-tabs` | Mount-once-keep-alive tab panels |
| `components/shared/stepper` (`Stepper` + step defs in `lib/constants/education.ts`) | Wizard/step indicators |

## 4 · Adoption recipe for a new app

1. Copy `tailwind.preset.ts` and the marked token block from
   `app/globals.css`; set `presets: [preset]` in the new app's config.
2. Copy `components/ui/**` (shadcn primitives) and `components/shared/**` +
   `components/error/**` (the L2 kit) wholesale.
3. Copy `lib/utils.ts`, `lib/date-utils.ts`, `lib/currency-utils.ts` and the
   generic hooks (`use-list-params`, `use-tab-from-url`, `use-visited-tabs`).
4. Replicate the fonts setup (next/font self-hosting of DM Sans / JetBrains
   Mono / Caveat exposing `--font-sans/--font-mono/--font-caveat`).
5. Build domain components (L3) that compose the kit and own the data
   shapes; keep the PORT-04 lint block so the boundary stays locked.

## 5 · Prop vocabulary (PORT-03)

`label` (visible text) · `hint` (secondary line) · `tone` (`StatusTone`) ·
`size` (`"sm" | "md"`) · `icon` (LucideIcon) · `action`/`actions`
(ReactNode) · `compact` (density switch) · `emptyState`
(`{title, hint?, action?}`). Every kit component: named export, exported
props interface, `className` merged via `cn()`, `data-testid` on the root,
no `any` in public props. Kit components that display money/dates format
raw values themselves via the shared formatters.

Guided-tour anchors (docs/guided-tours/): `data-tour` attributes mark tour
targets — derived automatically on sidebar nav links (`nav:<href>` in
portal-sidebar) and PageTabs triggers (`tab:<value>`); page widgets use
kebab-case ids (`data-tour="dashboard-stats"`). Keep them stable — the tour
registry test asserts every referenced anchor exists.
