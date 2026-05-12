# Student Level Progression — Frontend UI Plan (Sub-project B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block ineligible students from the New Order dialog using `materialsOrdered`, and replace the checkbox scroll-lists for both students and CIs with a searchable multi-select dropdown.

**Architecture:** New shared `MultiSelectDropdown` component (Popover + Command, no new deps). Orders page filters students via `!student.materialsOrdered` (mirrors existing CI filter). Checkbox scroll-list + selected-items summary replaced by the dropdown in both dialogs.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui (`Popover`, `Command`, `Checkbox` from `components/ui/`).

**Prerequisite:** Plan A (backend) must be deployed so `GET /student` returns `materialsOrdered`.

---

### Task 1: `MultiSelectDropdown` shared component

**Files:**
- Create: `IPA-frontend/components/shared/MultiSelectDropdown.tsx`
- Modify: `IPA-frontend/components/shared/index.ts`

- [ ] **Step 1: Create the component**

```tsx
// IPA-frontend/components/shared/MultiSelectDropdown.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  emptyMessage = "No options available.",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false);

  function toggle(value: number) {
    onChange(
      selected.includes(value)
        ? selected.filter((id) => id !== value)
        : [...selected, value],
    );
  }

  function removeSelected(value: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((id) => id !== value));
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-sm text-muted-foreground">
              {selected.length === 0
                ? placeholder
                : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.sublabel ?? ""}`}
                      onSelect={() => toggle(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{option.label}</div>
                        {option.sublabel ? (
                          <div className="text-xs text-muted-foreground">
                            {option.sublabel}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[180px] truncate text-xs">{option.label}</span>
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => removeSelected(option.value, e)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Export from the shared index**

Open `IPA-frontend/components/shared/index.ts`. Add this line at the end:

```typescript
export { MultiSelectDropdown } from "./MultiSelectDropdown";
export type { MultiSelectOption } from "./MultiSelectDropdown";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd IPA-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd IPA-frontend
git add components/shared/MultiSelectDropdown.tsx
git add components/shared/index.ts
git commit -m "feat(shared): add MultiSelectDropdown component"
```

---

### Task 2: Update the orders page — student eligibility filter + dropdown

**Files:**
- Modify: `IPA-frontend/app/franchisee/orders/page.tsx`

- [ ] **Step 1: Replace `activeStudents` with `eligibleStudents` and remove checkbox helpers**

In `IPA-frontend/app/franchisee/orders/page.tsx`:

1. Replace the `activeStudents` memo (around line 79):

```typescript
  const eligibleStudents = useMemo(
    () => students.filter((student) => student.isActive && !student.materialsOrdered),
    [students],
  );
```

2. Remove the `toggleStudentSelection` and `toggleCISelection` helper functions (around lines 182–196). They are replaced by direct `setSelectedStudents` / `setSelectedInstructors` calls.

3. Replace the `selectedStudentRows` memo (around line 92):

```typescript
  const selectedStudentRows = eligibleStudents.filter((student) =>
    selectedStudents.includes(student.id),
  );
```

4. Also update `activeCIs` references that feed `selectedCIRows` — `activeCIs` already filters `!ci.materialsOrdered`, no change needed there.

- [ ] **Step 2: Add `MultiSelectDropdown` import**

At the top of the file, add `MultiSelectDropdown` to the shared import:

```typescript
import { TablePageShell, MultiSelectDropdown } from "@/components/shared";
```

Also remove these imports since they're no longer needed in the student/CI list sections:
```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

(Keep `Checkbox` only if used elsewhere in the file. If not used anywhere else after this change, remove it.)

- [ ] **Step 3: Replace the student dialog list section**

Find the student dialog `<Card>` body (the section with `Select students` as the title, containing the scrollable checkbox list and selected-students summary). Replace it entirely:

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Select students</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <MultiSelectDropdown
      options={eligibleStudents.map((student) => ({
        value: student.id,
        label: student.name,
        sublabel: `${student.rollNo} | ${getLevelDisplay(student.level)}`,
      }))}
      selected={selectedStudents}
      onChange={setSelectedStudents}
      placeholder="Select students…"
      emptyMessage="No eligible students. Students with a pending or fulfilled order for their current level will not appear here."
    />

    <div className="space-y-2">
      <Label>Notes (optional)</Label>
      <Textarea
        rows={3}
        placeholder="Any delivery or packing notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Replace the CI dialog list section**

Find the CI dialog `<Card>` body (the section with `Select instructors` as the title). Replace it entirely:

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Select instructors</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <MultiSelectDropdown
      options={activeCIs.map((ci) => ({
        value: ci.id,
        label: ci.name,
        sublabel: `${ci.instructorId} | ${ci.status}`,
      }))}
      selected={selectedInstructors}
      onChange={setSelectedInstructors}
      placeholder="Select instructors…"
      emptyMessage="No eligible instructors. Instructors with materials already ordered will not appear here."
    />

    <div className="space-y-2">
      <Label>Notes (optional)</Label>
      <Textarea
        rows={3}
        placeholder="Any delivery or packing notes"
        value={ciNotes}
        onChange={(event) => setCiNotes(event.target.value)}
      />
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 5: Clean up unused imports and state**

Remove from the import list any imports that are no longer used after removing the checkbox lists:
- `X` from `lucide-react` (was used for the remove buttons in the selected-items summary) — remove only if not used elsewhere in the file
- `selectedStudentRows` variable (if defined as a separate const, it can be removed since it's no longer used in the JSX)
- `selectedCIRows` variable — same

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd IPA-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Start the dev server and test manually**

```bash
cd IPA-frontend && npm run dev
```

Open http://localhost:3000 and log in as a franchisee. Navigate to **Orders**.

Test checklist:
- [ ] Click **New order** → student dropdown appears (no checkbox list)
- [ ] Students with `materialsOrdered: true` do not appear in the dropdown
- [ ] Search works within the dropdown
- [ ] Selecting multiple students shows badges below the trigger
- [ ] Removing a badge deselects the student
- [ ] Invoice preview updates as students are selected/deselected
- [ ] Click **CI Material Request** → CI dropdown appears
- [ ] CIs with `materialsOrdered: true` do not appear
- [ ] Placing an order succeeds and closes the dialog

- [ ] **Step 8: Commit**

```bash
cd IPA-frontend
git add app/franchisee/orders/page.tsx
git commit -m "feat(orders): block ineligible students and replace checkbox lists with MultiSelectDropdown"
```
