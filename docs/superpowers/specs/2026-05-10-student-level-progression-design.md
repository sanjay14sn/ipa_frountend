# Student Level Progression — Design Spec
**Date:** 2026-05-10

## Context

Students advance through multiple levels (EL1, L1, L2, …). Each level requires a separate material order and produces a certificate. Currently:

- The `Student` model has a single flat `levelId` pointing to the current level — no per-level history.
- Certificates are tracked on a separate `Certificate` entity with marks stored there.
- There is no `materialsOrdered` flag per student-level, so the Orders page cannot block duplicate orders the way it already blocks duplicate CI material requests (via `CITraining.materialsOrdered`).

This spec introduces `StudentLevelProgression` — a per-student, per-level record that mirrors the `CITraining` pattern — and then uses it to enforce order eligibility and replace the current flat certificate approach.

---

## Sub-project A — StudentLevelProgression entity

### Backend model (`student_level_progressions` table)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | int PK auto | | |
| `studentId` | int FK → students (CASCADE) | | |
| `levelId` | int FK → levels (SET NULL) | | |
| `status` | enum | `ENROLLED` | `ENROLLED` → `UNDERGOING` → `COMPLETED` / `FAILED` |
| `marks` | float nullable | null | overall marks |
| `theoryMarks` | float nullable | null | |
| `materialsOrdered` | boolean | false | set `true` when order is placed; never reset |
| `materialsOrderedAt` | date nullable | null | |
| `completedAt` | date nullable | null | |
| `certificateIssued` | boolean | false | |
| `certificatePdfPath` | string nullable | null | |
| `certificateIssuedAt` | date nullable | null | |
| `createdBy` | int | | |
| `updatedBy` | int | | |
| `createdAt` / `updatedAt` | timestamps | | |

Unique constraint: `(studentId, levelId)`.

### Lifecycle

1. **Enrollment / level assignment** — when a student is created or advances to a new level, a `StudentLevelProgression` row is inserted with `status = ENROLLED` and `materialsOrdered = false`.
2. **Materials ordered** — when a student order is placed, the Order service sets `materialsOrdered = true` and `materialsOrderedAt = now` on the matching progression row.
3. **Marks entry** — franchisee enters `theoryMarks` (and optionally `marks`); `status` moves to `UNDERGOING`.
4. **Completion** — when passing marks are confirmed, `status` → `COMPLETED`, `completedAt = now`.
5. **Level advancement** — a new `StudentLevelProgression` row is created for the next level (`materialsOrdered = false`). The student's `levelId` on the `Student` record is updated to the new level.
6. **Certificate** — when admin issues a certificate, `certificateIssued = true`, `certificatePdfPath` and `certificateIssuedAt` are set on the progression row for that level.

### Backend API endpoints

| Method | Path | Action |
|---|---|---|
| `GET` | `/student/:id/progressions` | List all level progressions for a student |
| `GET` | `/student/:id/progression/current` | Current level's progression |
| `PATCH` | `/student/:id/progression/:progressionId` | Update marks / status |
| `POST` | `/student/:id/progression` | Create new progression on level advancement |

The existing `GET /student` (franchisee student list) must include `materialsOrdered` in the response, derived from the student's current `StudentLevelProgression`. This is the only frontend-facing change needed for order blocking.

### Backend files changed

| File | Change |
|---|---|
| `src/modules/students/model/student-level-progression.model.ts` | New Sequelize model |
| `src/modules/students/student-level-progression.service.ts` | New service |
| `src/modules/students/student-level-progression.controller.ts` | New controller |
| `src/modules/students/students.module.ts` | Register new model/service/controller |
| `src/modules/orders/orders.service.ts` | On order create: set `materialsOrdered = true` on matching progression row |
| `src/modules/students/students.service.ts` | Include current progression `materialsOrdered` in student list response |
| `src/common/interfaces/student.interface.ts` | Add `materialsOrdered?: boolean` |

---

## Sub-project B — Order blocking + multi-select dropdown UI

### Student order blocking

**`services/student.service.ts`**
- Add `materialsOrdered?: boolean` to `StudentData` interface.
- In `mapStudentRow`, map it: `materialsOrdered: Boolean(row.materialsOrdered ?? false)`.

**`app/franchisee/orders/page.tsx`**
- Rename `activeStudents` → `eligibleStudents`; add `!student.materialsOrdered` to the filter:
  ```typescript
  const eligibleStudents = useMemo(
    () => students.filter(s => s.isActive && !s.materialsOrdered),
    [students],
  );
  ```
- Update all references from `activeStudents` → `eligibleStudents`.
- Empty-state message: `"No students are eligible for ordering. Students with a pending or fulfilled order for their current level will not appear here."`

The CI list is already correct (`!ci.materialsOrdered`). No change needed.

### Multi-select dropdown component

**New file: `components/shared/MultiSelectDropdown.tsx`**

```
Props:
  options:      { value: number; label: string; sublabel?: string }[]
  selected:     number[]
  onChange:     (ids: number[]) => void
  placeholder?: string      // default "Select…"
  emptyMessage?: string     // shown when options is empty
```

Internals:
- `Popover` trigger button — shows selected count badge when `selected.length > 0`, otherwise `placeholder`.
- `Command` panel inside the popover with `CommandInput` for search, `CommandEmpty`, and `CommandItem` per option.
- Each `CommandItem` renders a `Checkbox` + label + sublabel. Clicking toggles membership in `selected`.
- Uses existing `Popover`, `Command`, `Checkbox` from `@/components/ui/`.

**`components/shared/index.ts`** — export `MultiSelectDropdown`.

### Order dialog updates (`app/franchisee/orders/page.tsx`)

Replace the scrollable checkbox list + selected-items summary in **both** dialogs:

- **Student dialog**: replace checkbox list and selected-student card with `<MultiSelectDropdown options={...} selected={selectedStudents} onChange={setSelectedStudents} placeholder="Select students" emptyMessage="No eligible students." />`
- **CI dialog**: same replacement bound to `selectedInstructors` / `setSelectedInstructors`.
- Remove `toggleStudentSelection` and `toggleCISelection` helpers — `onChange` on the dropdown replaces them.
- Notes textarea and invoice preview card are unchanged.
- Dialog sizing (max-w-5xl grid) can shrink to single-column now that the list is a compact dropdown; adjust if needed.

### Frontend files changed

| File | Change |
|---|---|
| `services/student.service.ts` | Add `materialsOrdered` to interface + `mapStudentRow` |
| `components/shared/MultiSelectDropdown.tsx` | New component |
| `components/shared/index.ts` | Export `MultiSelectDropdown` |
| `app/franchisee/orders/page.tsx` | `eligibleStudents` filter; replace checkbox lists with `MultiSelectDropdown` |

---

## Verification

### Sub-project A
1. Create a student — confirm a `StudentLevelProgression` row is created for their starting level with `materialsOrdered = false`.
2. Place a student order — confirm `materialsOrdered = true` on the progression row.
3. Advance the student to the next level — confirm a new progression row appears with `materialsOrdered = false`.
4. Check the student list API response — confirm `materialsOrdered` is included and reflects the current level's flag.

### Sub-project B
1. Open the New Order dialog — eligible students appear in the dropdown; students with `materialsOrdered = true` do not.
2. Open the CI Material Request dialog — CIs with `materialsOrdered = true` do not appear.
3. Select multiple students via the dropdown — invoice preview updates correctly.
4. Select multiple CIs via the dropdown — invoice preview updates correctly.
5. Search within both dropdowns — filtering works.
6. Place an order — after success, re-opening the dialog should no longer show those students.
