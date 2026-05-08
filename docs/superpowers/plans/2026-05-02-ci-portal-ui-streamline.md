# CI Portal UI Streamline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Course Instructor portal feel consistent with the franchisee portal, make the CI agreement route show the agreement detail directly after onboarding, add a useful CI dashboard, enable working admin CI training package creation, and align the franchisee Course Instructor page with the newer shared table UI.

**Architecture:** Keep the existing Next.js App Router structure. Reuse the shared `DataTable`, `TablePageShell`, `TableLoadingState`, and card/detail patterns already present under `components/shared` and `components/agreements`. Avoid introducing a second table system or duplicate styling layer.

**Tech Stack:** Next.js 16, React 19, TypeScript, SWR, TanStack Query, shadcn-style UI components, existing Axios services, existing NestJS backend API in `../ipa-new`.

---

## Current State And Assumptions

- Frontend repo: `C:\Users\Administrator\Desktop\IPA\IPA-frontend`.
- Backend repo for API contract reference: `C:\Users\Administrator\Desktop\IPA\ipa-new`.
- CI portal currently has no `app/ci/page.tsx` and no dashboard route.
- CI sidebar currently sends the logo and "My Agreement" to `/ci/agreement`.
- `app/ci/agreement/page.tsx` is an onboarding/signing stepper. It should remain for `PENDING_CI_SIGNATURE`, but signed/countersigned states should show read-only agreement details directly.
- CI package purchase has a frontend bug: `app/ci/training/packages/page.tsx` calls `initiateCITrainingPurchase()` without passing the selected package, while backend `POST /ci/training/purchase/initiate` requires `{ packageIds: number[] }`.
- Admin CI package management exists at `app/admin/catalog/ci-training-packages/page.tsx`, but the service contract is wrong for the current backend.
- Backend admin package create/update endpoints are:
  - `POST /catalog/ci-training-package`
  - `PATCH /catalog/ci-training-package/:id`
  - `POST /catalog/ci-training-package/generate-default?programId=...`
  - `GET /catalog/ci-training-package/by-program/:programId`
- Backend package DTO requires `programId`, `name`, `code`, `packageOrder`, `fee`, and `trainingLevelIds`. It does not accept `fromLevel`, `toLevel`, or `currency`.
- The "My Agreement directly shows agreement details page" requirement is interpreted as: CI portal has only one current agreement, so `/ci/agreement` should show detail immediately after CI signature, not a list/table.

## Files To Modify Or Create

- Create: `app/ci/page.tsx`
- Create: `app/ci/dashboard/page.tsx`
- Create: `app/ci/components/ci-dashboard-cards.tsx`
- Create: `components/agreements/CIAgreementDetail.tsx`
- Modify: `app/ci/layout.tsx`
- Modify: `components/dynamic-sidebar.tsx`
- Modify: `app/ci/agreement/page.tsx`
- Modify: `app/ci/training/packages/page.tsx`
- Modify: `app/ci/training/progress/page.tsx`
- Modify: `app/ci/training/upcoming/page.tsx`
- Modify: `services/ci-training.service.ts`
- Modify: `services/catalog-admin.service.ts`
- Modify: `app/admin/catalog/ci-training-packages/page.tsx`
- Modify: `app/admin/ci-training/ci-training-section.tsx`
- Modify: `app/franchisee/course-instructors/page.tsx`
- Modify: `app/franchisee/course-instructors/components/CourseInstructorTabs.tsx`
- Modify: `app/franchisee/course-instructors/components/CourseInstructorsTable.tsx`
- Modify: `app/franchisee/course-instructors/components/PaymentCourseInstructorsTable.tsx`
- Verify only unless needed: `../ipa-new/src/modules/academic-catalog/controllers/admin-auth.controller.ts`
- Verify only unless needed: `../ipa-new/src/modules/academic-catalog/controllers/both-auth.controller.ts`
- Verify only unless needed: `../ipa-new/src/modules/academic-catalog/application/dto/create-ci-training-package.dto.ts`
- Verify only unless needed: `../ipa-new/src/modules/ci-training/controllers/ci-auth.controller.ts`

## Design Rules For The Change

- Use `TablePageShell` for top-level CI/franchisee/admin list pages.
- Use `DataTable` for all tabular CI/franchisee/admin package lists. Do not use raw `Table` unless displaying a small nested read-only breakdown inside a card.
- Keep portal visual language close to `app/franchisee/dashboard/page.tsx`: rounded cards, subtle borders, `bg-card`, `bg-accent/30`, small uppercase module pills, and restrained primary-color accents.
- Do not add a separate UI kit.
- Keep admin package management super-admin compatible. If the backend rejects non-super admins, show the backend error message cleanly.
- Keep CI onboarding access rules intact: unsigned CI users can access only login/change-password/agreement signing.

---

## Task 1: Fix CI Package API Contract

**Files:**
- Modify: `services/ci-training.service.ts`
- Modify: `services/catalog-admin.service.ts`

- [ ] **Step 1: Update CI package purchase request shape**

In `services/ci-training.service.ts`, change `initiateCITrainingPurchase` so it accepts one or more package IDs and always sends the backend-required body.

Required final behavior:

```ts
export async function initiateCITrainingPurchase(
  packageIds: number[],
): Promise<CITrainingPurchaseInitiateResponse> {
  const res = await api.post("/ci/training/purchase/initiate", { packageIds });
  return res.data?.data ?? res.data;
}
```

Also normalize `listCIPackages`, `getCIProgress`, and `getCIUpcomingSessions` to unwrap `{ data }` consistently:

```ts
const payload = res.data?.data ?? res.data;
return Array.isArray(payload) ? payload : [];
```

- [ ] **Step 2: Update CI package item type for backend response**

Current backend package response includes `trainingLevelIds`, `code`, `description`, `packageOrder`, and not guaranteed `fromLevel/toLevel`. Update `CITrainingPackageItem` to tolerate both current and old fields:

```ts
export interface CITrainingPackageItem {
  id: number;
  programId?: number;
  name: string;
  code?: string;
  description?: string | null;
  packageOrder?: number;
  trainingLevelIds?: number[];
  fromLevel?: number;
  toLevel?: number;
  fee: number;
  currency?: string;
  isActive?: boolean;
  isPurchased: boolean;
}
```

- [ ] **Step 3: Replace wrong admin catalog endpoints**

In `services/catalog-admin.service.ts`, change admin package functions to match backend routes:

```ts
export interface CITrainingPackage {
  id: number;
  programId: number;
  name: string;
  code: string;
  description?: string | null;
  packageOrder: number;
  fee: number;
  isActive: boolean;
  trainingLevelIds: number[];
  createdAt?: string;
}

export async function listCITrainingPackages(params: {
  programId: number;
}): Promise<CITrainingPackage[]> {
  const res = await api.get(
    `/catalog/ci-training-package/by-program/${params.programId}`,
  );
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function createCITrainingPackage(input: {
  programId: number;
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
}): Promise<CITrainingPackage> {
  const res = await api.post("/catalog/ci-training-package", input);
  return res.data?.data ?? res.data;
}

export async function updateCITrainingPackage(
  id: number,
  input: Partial<{
    name: string;
    code: string;
    description: string;
    packageOrder: number;
    fee: number;
    trainingLevelIds: number[];
    isActive: boolean;
  }>,
): Promise<CITrainingPackage> {
  const res = await api.patch(`/catalog/ci-training-package/${id}`, input);
  return res.data?.data ?? res.data;
}

export async function generateDefaultPackages(
  programId: number,
): Promise<CITrainingPackage[]> {
  const res = await api.post(
    "/catalog/ci-training-package/generate-default",
    null,
    { params: { programId } },
  );
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : [];
}
```

- [ ] **Step 4: Run type check for changed services**

Run:

```bash
npm run lint
```

Expected: no new lint/type errors from the service files. Existing unrelated errors should be captured in the final notes if present.

---

## Task 2: Add CI Dashboard Route And Signed-In Landing

**Files:**
- Create: `app/ci/page.tsx`
- Create: `app/ci/dashboard/page.tsx`
- Create: `app/ci/components/ci-dashboard-cards.tsx`
- Modify: `app/ci/layout.tsx`
- Modify: `components/dynamic-sidebar.tsx`

- [ ] **Step 1: Create `/ci` redirect page**

Create `app/ci/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function CIIndexPage() {
  redirect("/ci/dashboard");
}
```

- [ ] **Step 2: Add Dashboard item to CI sidebar**

In `components/dynamic-sidebar.tsx`, update `ciNavigation` to include:

```ts
{
  title: "Overview",
  items: [
    {
      title: "Dashboard",
      url: "/ci/dashboard",
      icon: LayoutDashboard,
    },
  ],
},
```

Keep the Agreement group after Overview. Do not expose Dashboard in `ciOnboardingNavigation`.

- [ ] **Step 3: Make CI shell header and logo link to dashboard after signed**

In `components/dynamic-sidebar.tsx`, change the CI logo link:

```ts
isCIUser
  ? ciAgreementLocked
    ? "/ci/agreement"
    : "/ci/dashboard"
```

In `app/ci/layout.tsx`, change the breadcrumb link for signed CI users to `/ci/dashboard` and label it `CI Portal`. Keep unsigned agreement page bare.

- [ ] **Step 4: Implement dashboard data composition**

Create `app/ci/dashboard/page.tsx` as a client component that fetches:

- `getCIAgreement()`
- `getCIProgress()`
- `getCIUpcomingSessions()`
- `listCIPackages()`

Compute:

- `completedLevels`: progress rows with `status === "COMPLETED"`.
- `currentTrainedLevel`: the completed row with the highest `trainingLevelId`; show its `trainingLevelName`, marks, and `completedAt`.
- `nextTraining`: first upcoming session sorted by nearest `sessionDate`; prefer `ASSIGNED`, then `WAITING`.
- `pendingPackageCount`: package rows where `!isPurchased`.
- `purchasedPackageCount`: package rows where `isPurchased`.
- `agreementStatus`: agreement phase label.

Use no new endpoint unless existing data is insufficient.

- [ ] **Step 5: Create dashboard card components**

Create `app/ci/components/ci-dashboard-cards.tsx` with small focused components:

```tsx
export function ModulePill({ label }: { label: string }) { ... }
export function CIStatCard(props: { label: string; value: string; sub?: string; icon: ElementType; href?: string }) { ... }
export function CIDashboardPanel(props: { label: string; title: string; href?: string; children: ReactNode }) { ... }
```

Model the styling on `app/franchisee/dashboard/page.tsx`, but keep this file CI-specific to avoid refactoring the franchisee dashboard during this task.

- [ ] **Step 6: Dashboard layout content**

The dashboard should contain:

- Header card: "Course Instructor Dashboard", instructor name/code from `useCIAuth()`, agreement status badge.
- Stat row:
  - Current trained level
  - Next training
  - Completed levels
  - Packages purchased
  - Pending packages
- Quick access panel:
  - My Agreement -> `/ci/agreement`
  - Training Packages -> `/ci/training/packages`
  - Training Progress -> `/ci/training/progress`
  - Upcoming Sessions -> `/ci/training/upcoming`
- Recent training panel:
  - Last 3 progress entries
  - Show marks when completed
- Next session panel:
  - Date, state/region, venue, status
  - Empty state if no upcoming training

- [ ] **Step 7: Access control behavior**

In `app/ci/layout.tsx`, keep this logic:

- No user -> `/ci/login`
- `mustChangePassword` -> `/ci/change-password`
- `agreementPhase === "PENDING_CI_SIGNATURE"` and not unlocked path -> `/ci/agreement`

Confirm `/ci/dashboard` is blocked until the CI has signed.

---

## Task 3: Make CI Agreement Route Show Details Directly After Signing

**Files:**
- Create: `components/agreements/CIAgreementDetail.tsx`
- Modify: `app/ci/agreement/page.tsx`
- Modify: `services/ci-training.service.ts`

- [ ] **Step 1: Extend `CIAgreementRecord` if needed**

In `services/ci-training.service.ts`, ensure `CIAgreementRecord` includes any detail fields used by the detail component:

```ts
export interface CIAgreementRecord {
  id: number;
  title: string;
  phase: CIAgreementPhase;
  validFrom: string | null;
  validUntil: string | null;
  dateOfSigning: string | null;
  ciShare: number | null;
  levelDurations: { l1: number; l2: number };
  franchisee: { name: string; centreName: string; centreAddress: string } | null;
  instructor: { name: string; address: string | null; phone: string | null } | null;
  ciSignedAt?: string | null;
  franchiseeSignedAt?: string | null;
  ciSignatureUrl?: string | null;
  franchiseeSignatureUrl?: string | null;
}
```

If backend does not return signature URLs, the detail component must show `Pending` or `Not available`, not fail.

- [ ] **Step 2: Create read-only CI agreement detail component**

Create `components/agreements/CIAgreementDetail.tsx` that accepts:

```ts
export function CIAgreementDetail({
  agreement,
}: {
  agreement: CIAgreementRecord;
}) { ... }
```

Content requirements:

- Top card with title, status badge, validity dates.
- Key facts: franchisee, centre, instructor, phone, CI address, term.
- Commercial card: CI share per month, Level 1 duration/total, Level 2 onwards duration/total.
- Signature lifecycle card:
  - CI signed date
  - Franchisee signed date
  - Agreement phase
- Terms tab/card using `ciAgreementContent`, rendered read-only with expandable sections.

Use `TablePageShell` only if this component owns the full page shell. If it is nested inside `app/ci/agreement/page.tsx`, use cards and let the page supply spacing.

- [ ] **Step 3: Split onboarding mode from detail mode**

In `app/ci/agreement/page.tsx`, keep the current stepper for:

```ts
agreement.phase === "PENDING_CI_SIGNATURE"
```

For these phases, bypass the stepper and render `CIAgreementDetail` directly:

```ts
agreement.phase === "PENDING_FRANCHISEE_SIGNATURE"
agreement.phase === "SIGNED"
agreement.phase === "EXPIRED"
```

For `PENDING_FRANCHISEE_SIGNATURE`, show a visible notice:

```text
You have signed this agreement. It becomes active after your franchisee countersigns.
```

For `SIGNED`, show:

```text
Your Course Instructor Agreement is fully signed and active.
```

- [ ] **Step 4: Remove invalid router usage in `SignatureStep`**

`SignatureStep` currently calls `router.push("/ci/training/packages")` inside a nested component where `router` is not defined. Fix by passing an `onGoToPortal` prop or removing that button when detail mode is introduced.

Preferred:

```tsx
<Button className="mt-5" onClick={onGoToPortal}>
  Go to dashboard
</Button>
```

Parent passes:

```ts
onGoToPortal={() => router.push("/ci/dashboard")}
```

- [ ] **Step 5: Manual behavior check**

Check these states using available backend/test users:

- Unsigned CI: `/ci/agreement` shows 3-step flow.
- Signed by CI but waiting franchisee: `/ci/agreement` shows detail view plus waiting notice.
- Fully signed CI: `/ci/agreement` shows detail view directly.
- Signed CI sidebar "My Agreement" lands on detail directly.

---

## Task 4: Refactor CI Training Pages To Franchisee-Style UI

**Files:**
- Modify: `app/ci/training/packages/page.tsx`
- Modify: `app/ci/training/progress/page.tsx`
- Modify: `app/ci/training/upcoming/page.tsx`

- [ ] **Step 1: Packages page shell**

Wrap `app/ci/training/packages/page.tsx` in `TablePageShell` with:

```tsx
<TablePageShell
  title="Training packages"
  description="Purchase CI training packages to unlock upcoming training levels."
>
```

Use card grid for packages, but match franchisee card style:

- `rounded-2xl border bg-card shadow-sm`
- Header with package name, code/order badge, purchased badge.
- Body with covered levels derived from `trainingLevelIds`.
- Fee shown with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`.

- [ ] **Step 2: Fix package purchase flow**

Change purchase button handler:

```ts
await initiateCITrainingPurchase([pkg.id]);
```

Not:

```ts
await initiateCITrainingPurchase();
```

Keep abandon/verify flow, but make sure `purchaseId` and `orderId` are passed exactly as returned.

- [ ] **Step 3: Handle Razorpay unavailable**

Before `new window.Razorpay`, guard:

```ts
if (!window.Razorpay) {
  toast({ title: "Payment gateway unavailable", variant: "destructive" });
  return;
}
```

This prevents blank failures in local development.

- [ ] **Step 4: Progress page should use `DataTable`**

Refactor `app/ci/training/progress/page.tsx`:

- Use `TablePageShell`.
- Keep overview card at top.
- Use `DataTable<CIProgressItem>` for the progress list.
- Columns:
  - Level
  - Status
  - Session date
  - Theory
  - Practical
  - Completed at
- `renderMainCell`: training level name and `Level #`.
- Empty state: "No training progress yet. Purchase a package to get started."

- [ ] **Step 5: Upcoming page should use `DataTable`**

Refactor `app/ci/training/upcoming/page.tsx`:

- Use `TablePageShell`.
- Use `DataTable<CIUpcomingSession>`.
- Columns:
  - Training level
  - Date
  - State/region
  - Venue
  - Status
- Sort client-side by `sessionDate` ascending before rendering.
- Empty state: "No upcoming sessions found."

- [ ] **Step 6: Normalize date/status helpers**

Add local helpers in each file or extract to `app/ci/training/_utils.ts` if repeated:

```ts
function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}
```

Keep extraction small. Do not create a large utilities module.

---

## Task 5: Enable Admin CI Training Package Flow In The CI Training Area

**Files:**
- Modify: `app/admin/catalog/ci-training-packages/page.tsx`
- Modify: `app/admin/ci-training/ci-training-section.tsx`
- Modify: `services/catalog-admin.service.ts`

- [ ] **Step 1: Replace Program ID text inputs with program selector**

In `app/admin/catalog/ci-training-packages/page.tsx`, load programs with `getAllPrograms()` from `services/program.service`.

Use a `Select` for:

- Page-level program filter.
- Package modal program selection when creating.
- Generate defaults program selection.

Do not ask admin to type raw Program ID.

- [ ] **Step 2: Load CI training levels for selected program**

Use `listCITrainingLevels({ programId })` from `services/catalog-admin.service.ts` or `getTrainingLevelsByProgram` if it returns the CI training levels needed.

The package modal must show a multi-select list of CI training levels for the selected program.

Validation before submit:

- Program selected.
- Name is non-empty.
- Code is non-empty.
- Package order is positive integer.
- Fee is non-negative number.
- At least 3 training levels selected.
- Selected levels are contiguous by display order if the frontend can determine order. Backend also validates this.

- [ ] **Step 3: Update package modal fields**

Replace fields:

- Remove `fromLevel`
- Remove `toLevel`
- Remove `currency`

Add fields:

- `code`
- `description`
- `packageOrder`
- `trainingLevelIds`

Submit create body:

```ts
await createCITrainingPackage({
  programId: Number(programId),
  name,
  code,
  description: description.trim() || undefined,
  packageOrder: Number(packageOrder),
  fee: Number(fee),
  trainingLevelIds,
});
```

Submit update body:

```ts
await updateCITrainingPackage(pkg.id, {
  name,
  code,
  description: description.trim() || undefined,
  packageOrder: Number(packageOrder),
  fee: Number(fee),
  isActive,
  trainingLevelIds,
});
```

- [ ] **Step 4: Convert admin package table to `DataTable`**

Replace raw `Table` in `app/admin/catalog/ci-training-packages/page.tsx` with `DataTable<CITrainingPackage>`.

Columns:

- Package
- Code
- Order
- Training levels
- Fee
- Status
- Actions

`renderMainCell` should show package name and description.

Use `toolbarActions` for:

- Program selector
- Generate defaults button
- New package button

- [ ] **Step 5: Add package management inside admin CI Training section**

In `app/admin/ci-training/ci-training-section.tsx`, add a third tab:

```tsx
<TabsTrigger value="packages">Packages</TabsTrigger>
```

Implementation options:

- Preferred: extract package manager UI from `app/admin/catalog/ci-training-packages/page.tsx` into `app/admin/catalog/ci-training-packages/CITrainingPackagesManager.tsx`, then reuse it in both the catalog page and the CI Training tab.
- Acceptable: add a prominent action button in CI Training header linking to `/admin/catalog/ci-training-packages`.

Preferred implementation gives admins package creation directly in the CI Training area, which matches the user request.

- [ ] **Step 6: Confirm backend contract**

Do not change backend unless the existing routes fail. If backend route fails, inspect:

- `../ipa-new/src/modules/academic-catalog/controllers/admin-auth.controller.ts`
- `../ipa-new/src/modules/academic-catalog/controllers/both-auth.controller.ts`
- `../ipa-new/src/modules/academic-catalog/application/services/ci-training-package.service.ts`

The backend already supports create/update/generate/list-by-program with the DTO shape above.

---

## Task 6: Align Franchisee Course Instructor Page With Common Table UI

**Files:**
- Modify: `app/franchisee/course-instructors/page.tsx`
- Modify: `app/franchisee/course-instructors/components/CourseInstructorTabs.tsx`
- Modify: `app/franchisee/course-instructors/components/CourseInstructorsTable.tsx`
- Modify: `app/franchisee/course-instructors/components/PaymentCourseInstructorsTable.tsx`

- [ ] **Step 1: Remove card/table mode toggle**

In `app/franchisee/course-instructors/page.tsx`, remove:

- `viewMode` state
- card/table toggle buttons
- `CourseInstructorCard` component unless still needed elsewhere
- card grid render branch

The page should always use the common table/tab experience.

- [ ] **Step 2: Use `TablePageShell` props instead of custom header card**

Replace the custom header card with:

```tsx
<TablePageShell
  title="Course instructors"
  description={`Manage your franchise course instructors for ${franchiseName}.`}
  actions={
    <Button onClick={() => setIsAddModalOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      Add Course Instructor
    </Button>
  }
>
```

If franchisee profile details are needed, render a small secondary line below the description inside the page body, not inside a bespoke header card.

- [ ] **Step 3: Standardize stats cards**

Keep the stats, but style them like dashboard cards:

- `rounded-xl border-border bg-card shadow-sm`
- Avoid colored backgrounds like `bg-purple-50`.
- Use `text-primary` for icons.

Stats should show:

- Total Course Instructors
- Active
- Payment Pending
- In Training
- New This Month

Fix `newThisMonth`: compute from `createdAt` instead of hardcoding `0`.

- [ ] **Step 4: Replace custom button tabs with shadcn Tabs**

In `CourseInstructorTabs.tsx`, replace local `activeTab` buttons with `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` from `components/ui/tabs`.

Tab labels:

- `All / Active & Training`
- `Payment Pending`

Keep badges with counts.

- [ ] **Step 5: Clean table typography and mojibake**

In `CourseInstructorsTable.tsx` and `PaymentCourseInstructorsTable.tsx`, replace mojibake separators like `â€¢` with ASCII-safe separators:

```tsx
{" | "}
```

or use plain commas. Do not introduce new non-ASCII characters unless the file already intentionally uses them.

- [ ] **Step 6: Improve payment pending table actions**

In `PaymentCourseInstructorsTable.tsx`, ensure actions fit the common table:

- Primary action: `Pay for Training`
- Secondary action: `View Progress`
- Icon-only graduation history button should have `aria-label`.

Keep `MultiLevelTrainingPaymentModal`, `GraduationHistoryModal`, and `TrainingProgressModal`.

- [ ] **Step 7: Preserve existing CRUD behavior**

After removing card mode, ensure these still work:

- Add Course Instructor opens `AddCourseInstructorModal`.
- Edit callback still opens `AddCourseInstructorModal` only if the page currently supports edit flow. If edit modal is not implemented, keep existing state untouched and note as follow-up.
- Delete confirmation still calls `deleteCourseInstructorWithRevalidation`.
- Payment success revalidates course instructors.

---

## Task 7: Optional CI Agreement Presence In Franchisee Portal

**Files:**
- Verify: `app/franchisee/ci-agreements/ci-agreements-section.tsx`
- Verify: route that mounts the CI agreements section
- Possibly modify: `app/franchisee/course-instructors/page.tsx`

- [ ] **Step 1: Confirm route exposure**

`app/franchisee/ci-agreements/ci-agreements-section.tsx` exists and uses the shared table. Confirm whether it is mounted by a route or tab.

If not mounted, choose one:

- Add a dedicated route `app/franchisee/ci-agreements/page.tsx` that renders `<CIAgreementsSection />`.
- Or add a tab in `app/franchisee/course-instructors/page.tsx` for CI agreements.

Preferred: add a dedicated route if sidebar/navigation already has room; otherwise add as a Course Instructors tab.

- [ ] **Step 2: Keep franchisee CI agreement table behavior**

Do not rewrite the section unless required. It already uses `DataTable`.

Only adjust:

- Header wording to match the Course Instructor page.
- Empty/loading state if inconsistent.
- Action button styling if visually off.

---

## Task 8: Polish, Error Handling, And Loading States

**Files:**
- Touch all modified page files as needed.

- [ ] **Step 1: Replace bare loading text**

Replace plain:

```tsx
<p>Loading...</p>
```

with `TableLoadingState` for table/list pages or a rounded card skeleton for dashboards.

- [ ] **Step 2: Normalize empty states**

Use `TableEmptyState` or `DataTable` `emptyMessage` for:

- CI packages empty
- CI progress empty
- CI upcoming empty
- Admin packages empty
- Franchisee CI empty

- [ ] **Step 3: Normalize money formatting**

Use:

```ts
new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(Number(value ?? 0))
```

Avoid hardcoded mojibake currency strings.

- [ ] **Step 4: Normalize date formatting**

Use `en-IN` date formatting or existing `date-fns` usage consistently. Invalid dates should render `-`.

- [ ] **Step 5: Ensure mobile behavior**

Check table pages on narrow viewport:

- Toolbar wraps cleanly.
- Action buttons wrap.
- Tabs wrap.
- No horizontal overflow except intentional table scroll inside `RawTableSurface`.

---

## Task 9: Verification Checklist

**Files:**
- No code changes in this task unless verification reveals defects.

- [ ] **Step 1: Lint**

Run in `C:\Users\Administrator\Desktop\IPA\IPA-frontend`:

```bash
npm run lint
```

Expected: pass, or only pre-existing unrelated errors documented clearly.

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected: Next.js build completes. If build fails because backend/network is unavailable, document exact error and verify with lint plus manual UI where possible.

- [ ] **Step 3: Manual route checks**

With dev server running:

```bash
npm run dev
```

Check these routes:

- `/ci/login`
- `/ci`
- `/ci/dashboard`
- `/ci/agreement`
- `/ci/training/packages`
- `/ci/training/progress`
- `/ci/training/upcoming`
- `/admin/ci-training`
- `/admin/catalog/ci-training-packages`
- `/franchisee/course-instructors`
- `/franchisee/ci-agreements` if added

- [ ] **Step 4: Manual scenario checks**

Validate:

- Unsigned CI cannot access dashboard and is redirected to agreement signing.
- Signed CI lands on dashboard.
- CI "My Agreement" shows detail directly.
- CI package purchase sends `{ packageIds: [selectedPackageId] }`.
- Admin can select a program, select CI training levels, create package, edit package, and generate default packages.
- Franchisee Course Instructor page no longer exposes old card/table toggle and uses the common table/tabs.

- [ ] **Step 5: Network payload checks**

In browser devtools, confirm:

- `POST /ci/training/purchase/initiate` body is `{ "packageIds": [id] }`.
- `GET /catalog/ci-training-package/by-program/:programId` is used for package list.
- `POST /catalog/ci-training-package` body includes `trainingLevelIds`, not `fromLevel/toLevel`.

---

## Suggested Commit Slices

- [ ] **Commit 1:** `fix: align ci training package api contracts`
- [ ] **Commit 2:** `feat: add ci dashboard and signed landing`
- [ ] **Commit 3:** `feat: show ci agreement detail after signing`
- [ ] **Commit 4:** `refactor: standardize ci training pages`
- [ ] **Commit 5:** `feat: enable admin ci package management flow`
- [ ] **Commit 6:** `refactor: align franchisee ci page tables`

## Known Risks

- The admin package UI currently assumes package ranges. Backend now models packages by explicit CI training level IDs. The UI must use level selection, not range fields.
- `GET /catalog/ci-training-package/by-program/:programId` requires a selected program. There is no current all-program package list endpoint in the backend. Do not keep an "All programs" mode unless the backend endpoint is added.
- CI agreement detail depends on what `/ci/agreement` returns. If signature URLs are unavailable, render lifecycle dates/status without image previews.
- Some files contain mojibake characters from earlier edits. Fix touched text opportunistically, but avoid broad encoding rewrites in unrelated files.
