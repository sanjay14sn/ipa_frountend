# Checkbox Panel v2 — Pending Selections + CI Training Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned "pending selections" section to `InventoryCheckboxLinkPanel`, fix section order in `inventory-section.tsx`, and wire the panel into `TrainingLevelMaterialsPicker` for CI training level inventory assignment via a new bulk-assign backend endpoint.

**Architecture:** The panel is modified in-place (no new props) — the pending-selections list reads item names from the already-passed `catalogItems` prop. The backend follows the exact same DTO → service → controller pattern used for regular levels. `TrainingLevelMaterialsPicker` keeps its dialog wrapper; only the Select+Add section inside is swapped for the panel.

**Tech Stack:** Next.js 15 / TypeScript / Tailwind / shadcn-ui · NestJS / class-validator / class-transformer · TanStack Query

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `ipa-new/src/modules/inventory-management/application/dto/bulk-assign-training-level-item.dto.ts` |
| **Modify** | `ipa-new/src/modules/inventory-management/application/services/inventory-query.service.ts` |
| **Modify** | `ipa-new/src/modules/inventory-management/controllers/admin-auth.controller.ts` |
| **Modify** | `IPA-frontend/services/inventory.service.ts` |
| **Modify** | `IPA-frontend/hooks/api/inventory.hooks.ts` |
| **Modify** | `IPA-frontend/components/inventory/InventoryCheckboxLinkPanel.tsx` |
| **Modify** | `IPA-frontend/app/admin/operations/components/legacy-tabs/inventory-section.tsx` |
| **Modify** | `IPA-frontend/app/admin/training-levels/TrainingLevelMaterialsPicker.tsx` |

---

## Task 1: Backend DTO for training-level bulk assign

**Files:**
- Create: `ipa-new/src/modules/inventory-management/application/dto/bulk-assign-training-level-item.dto.ts`

- [ ] **Step 1.1 — Create the file**

  ```typescript
  import { Type } from 'class-transformer';
  import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsOptional,
    Min,
    ValidateNested,
  } from 'class-validator';

  class BulkAssignTrainingLevelItemEntryDto {
    @IsInt()
    @Min(1)
    inventoryId: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    defaultQuantity?: number;
  }

  export class BulkAssignTrainingLevelItemDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => BulkAssignTrainingLevelItemEntryDto)
    items: BulkAssignTrainingLevelItemEntryDto[];
  }
  ```

- [ ] **Step 1.2 — Commit (from `ipa-new` directory)**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\ipa-new
  git add src/modules/inventory-management/application/dto/bulk-assign-training-level-item.dto.ts
  git commit -m "feat(inventory): add BulkAssignTrainingLevelItemDto"
  ```

---

## Task 2: Backend service method for training-level bulk assign

**Files:**
- Modify: `ipa-new/src/modules/inventory-management/application/services/inventory-query.service.ts`

The existing `replaceTrainingLevelTemplate(trainingLevelId, inventoryId, defaultQuantity)` method stays unchanged. Find it (around lines 529–544 in the original; now around 560 after earlier additions) and insert the new method immediately after it.

- [ ] **Step 2.1 — Add `bulkAssignTrainingLevelItems` after `replaceTrainingLevelTemplate`**

  ```typescript
  async bulkAssignTrainingLevelItems(
    trainingLevelId: number,
    items: Array<{ inventoryId: number; defaultQuantity?: number }>,
  ): Promise<{ assigned: number; failed: number[] }> {
    const results = await Promise.allSettled(
      items.map((item) =>
        this.replaceTrainingLevelTemplate(
          trainingLevelId,
          item.inventoryId,
          item.defaultQuantity ?? 1,
        ),
      ),
    );
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? items[i].inventoryId : null))
      .filter((x): x is number => x !== null);
    return { assigned: items.length - failed.length, failed };
  }
  ```

- [ ] **Step 2.2 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\ipa-new && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 2.3 — Commit**

  ```bash
  git add src/modules/inventory-management/application/services/inventory-query.service.ts
  git commit -m "feat(inventory): add bulkAssignTrainingLevelItems service method"
  ```

---

## Task 3: Backend controller endpoint for training-level bulk assign

**Files:**
- Modify: `ipa-new/src/modules/inventory-management/controllers/admin-auth.controller.ts`

- [ ] **Step 3.1 — Add import**

  In the existing DTO import block at the top of the controller, add:

  ```typescript
  import { BulkAssignTrainingLevelItemDto } from '../application/dto/bulk-assign-training-level-item.dto';
  ```

- [ ] **Step 3.2 — Add endpoint**

  Find the existing `assignTrainingLevelItem` endpoint (the `@Post('inventory/training-level/:trainingLevelId/items/assign')` handler). Immediately after its closing `}`, add:

  ```typescript
  @Post('inventory/training-level/:trainingLevelId/items/bulk-assign')
  @UseGuards(AdminJwtGuard)
  async bulkAssignTrainingLevelItems(
    @Param('trainingLevelId', ParseIntPipe) trainingLevelId: number,
    @Body() dto: BulkAssignTrainingLevelItemDto,
  ) {
    return this.queries.bulkAssignTrainingLevelItems(trainingLevelId, dto.items);
  }
  ```

- [ ] **Step 3.3 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\ipa-new && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3.4 — Commit**

  ```bash
  git add src/modules/inventory-management/controllers/admin-auth.controller.ts
  git commit -m "feat(inventory): add POST training-level bulk-assign controller endpoint"
  ```

---

## Task 4: Frontend service function + hooks helper

**Files:**
- Modify: `IPA-frontend/services/inventory.service.ts`
- Modify: `IPA-frontend/hooks/api/inventory.hooks.ts`

- [ ] **Step 4.1 — Add `bulkAssignInventoryToTrainingLevel` to `inventory.service.ts`**

  After the existing `assignInventoryToTrainingLevel` function, add:

  ```typescript
  export async function bulkAssignInventoryToTrainingLevel(
    trainingLevelId: number,
    items: Array<{ inventoryId: number; quantity?: number }>,
  ): Promise<{ assigned: number; failed: number[] }> {
    const response = await api.post(
      `/inventory/training-level/${trainingLevelId}/items/bulk-assign`,
      {
        items: items.map((item) => ({
          inventoryId: item.inventoryId,
          ...(item.quantity !== undefined ? { defaultQuantity: item.quantity } : {}),
        })),
      },
    );
    return unwrapData(response) as { assigned: number; failed: number[] };
  }
  ```

- [ ] **Step 4.2 — Add `invalidateTrainingLevelItems` to `inventory.hooks.ts`**

  After the existing `invalidateLevelItems` function, add:

  ```typescript
  export async function invalidateTrainingLevelItems(trainingLevelId: number) {
    try {
      await getQueryClientBridge().invalidateQueries({
        queryKey: queryKeys.inventory.trainingLevelItems(trainingLevelId),
      });
    } catch {
      /* ignore */
    }
  }
  ```

- [ ] **Step 4.3 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\IPA-frontend && npx tsc --noEmit
  ```

  Expected: no errors in the modified files.

- [ ] **Step 4.4 — Commit (from `IPA-frontend` directory)**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\IPA-frontend
  git add services/inventory.service.ts hooks/api/inventory.hooks.ts
  git commit -m "feat(inventory): add bulkAssignInventoryToTrainingLevel service fn and invalidateTrainingLevelItems hook"
  ```

---

## Task 5: Add pending-selections section to `InventoryCheckboxLinkPanel`

**Files:**
- Modify: `IPA-frontend/components/inventory/InventoryCheckboxLinkPanel.tsx`

The full updated file. Replace the entire file content with:

```tsx
"use client";

import { useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface InventoryCheckboxLinkPanelProps {
  linkedInventoryIds: Set<number>;
  catalogItems: InventoryItemSummary[];
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
}

function isPositiveInteger(n: number) {
  return Number.isInteger(n) && n > 0;
}

export function InventoryCheckboxLinkPanel({
  linkedInventoryIds,
  catalogItems,
  isCatalogLoading,
  onSave,
}: InventoryCheckboxLinkPanelProps) {
  const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const available = catalogItems.filter(
    (item) => !linkedInventoryIds.has(item.id),
  );

  const filtered = search.trim()
    ? available.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category?.name ?? "").toLowerCase().includes(q)
        );
      })
    : available;

  const pendingCount = Object.keys(pendingAdditions).length;
  const isDirty = pendingCount > 0;

  function toggleItem(id: number) {
    setPendingAdditions((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQuantity(id: number, value: string) {
    const parsed = Number(value);
    setPendingAdditions((prev) => ({
      ...prev,
      [id]: isPositiveInteger(parsed) ? parsed : prev[id],
    }));
  }

  async function handleSave() {
    if (!isDirty) return;
    const items = Object.entries(pendingAdditions).map(([id, qty]) => ({
      inventoryId: Number(id),
      quantity: qty,
    }));
    setIsSaving(true);
    try {
      await onSave(items);
      setPendingAdditions({});
      setSearch("");
    } catch (error) {
      toast({
        title: "Failed to save",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900">Add existing inventory</h4>
        {isDirty ? (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes ({pendingCount})
          </Button>
        ) : null}
      </div>

      {/* Section 2: Pending selections */}
      {isDirty ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-900">
            {pendingCount} selected — not yet saved
          </p>
          {Object.entries(pendingAdditions).map(([idStr, qty]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            if (!item) return null;
            return (
              <div key={id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {item.name}
                </span>
                <Input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={String(qty)}
                  onChange={(e) => setQuantity(id, e.target.value)}
                  className="h-7 w-16 shrink-0 text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleItem(id)}
                  aria-label={`Remove ${item.name} from selection`}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Section 3: Searchable catalog */}
      <Input
        className="mt-3"
        placeholder="Search by name, SKU, or category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white">
        {isCatalogLoading ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inventory catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-gray-500">
            {available.length === 0
              ? "All catalog items are already assigned."
              : "No items match your search."}
          </div>
        ) : (
          filtered.map((item) => {
            const checked = item.id in pendingAdditions;
            const qty = pendingAdditions[item.id] ?? 1;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 transition-colors ${
                  checked ? "bg-emerald-50/60" : "hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 bg-white text-transparent"
                  }`}
                  aria-label={checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                >
                  <Check className="h-3 w-3" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                    {item.sku ? <span>{item.sku}</span> : null}
                    {item.category?.name ? <span>{item.category.name}</span> : null}
                    <span>Avail {item.availableQty}</span>
                  </div>
                </div>

                {checked ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-gray-500">Qty</span>
                    <Input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={String(qty)}
                      onChange={(e) => setQuantity(item.id, e.target.value)}
                      className="h-7 w-16 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {item.inventoryType}
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

Key changes from the previous version:
- Added `X` to lucide-react import
- Added **Section 2** block between the header row and the search `<Input>` — shows each pending item with name, qty input, and × button that calls `toggleItem(id)`

- [ ] **Step 5.1 — Write the updated file** (full content above)

- [ ] **Step 5.2 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\IPA-frontend && npx tsc --noEmit
  ```

- [ ] **Step 5.3 — Commit**

  ```bash
  git add components/inventory/InventoryCheckboxLinkPanel.tsx
  git commit -m "feat(inventory): add pending-selections section to InventoryCheckboxLinkPanel"
  ```

---

## Task 6: Fix section order in `inventory-section.tsx`

**Files:**
- Modify: `IPA-frontend/app/admin/operations/components/legacy-tabs/inventory-section.tsx`

Currently inside `<CardContent className="space-y-3">`, the `<InventoryCheckboxLinkPanel>` appears **before** the assigned-items grid. The assigned-items grid must come first (Section 1) so the three sections read top-to-bottom in order.

- [ ] **Step 6.1 — Swap the two blocks**

  Find the `<CardContent className="space-y-3">` inside the `{levelIdNum ? (<Card ...>...</Card>) : null}` block.

  Currently it reads:
  ```tsx
  <CardContent className="space-y-3">
    <InventoryCheckboxLinkPanel
      key={levelIdNum}
      ...
    />

    <div className="grid gap-2">
      {assignedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items assigned to this level yet.
        </p>
      ) : (
        assignedItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">
                {item.sku} · default qty {item.defaultQuantity ?? 1}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void handleUnassign(item.id)}
            >
              <Unlink2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  </CardContent>
  ```

  Change it to (assigned grid first, panel second):
  ```tsx
  <CardContent className="space-y-3">
    <div className="grid gap-2">
      {assignedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items assigned to this level yet.
        </p>
      ) : (
        assignedItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">
                {item.sku} · default qty {item.defaultQuantity ?? 1}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void handleUnassign(item.id)}
            >
              <Unlink2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        ))
      )}
    </div>

    <InventoryCheckboxLinkPanel
      key={levelIdNum}
      linkedInventoryIds={new Set(assignedItems.map((item) => item.id))}
      catalogItems={catalogQuery.data ?? []}
      isCatalogLoading={catalogQuery.isLoading}
      onSave={async (items) => {
        const { assigned, failed } = await bulkAssignInventoryToLevel(levelIdNum, items);
        await invalidateLevelItems(levelIdNum);
        await assignedItemsQuery.refetch();
        if (failed.length > 0) {
          toast({
            title: `${assigned} assigned, ${failed.length} failed`,
            variant: "destructive",
          });
        } else {
          toast({
            title: `${items.length} item${items.length !== 1 ? "s" : ""} assigned to level`,
          });
        }
      }}
    />
  </CardContent>
  ```

- [ ] **Step 6.2 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\IPA-frontend && npx tsc --noEmit
  ```

- [ ] **Step 6.3 — Commit**

  ```bash
  git add app/admin/operations/components/legacy-tabs/inventory-section.tsx
  git commit -m "fix(inventory): render assigned-items grid above panel in InventorySection level card"
  ```

---

## Task 7: Wire `InventoryCheckboxLinkPanel` into `TrainingLevelMaterialsPicker`

**Files:**
- Modify: `IPA-frontend/app/admin/training-levels/TrainingLevelMaterialsPicker.tsx`

Replace the entire file with the following (preserving the dialog wrapper and linked-items badges; replacing the Select+Add grid):

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  useAllInventory,
  useInventoryItemsForTrainingLevel,
  invalidateTrainingLevelItems,
} from "@/hooks/api/inventory.hooks";
import {
  bulkAssignInventoryToTrainingLevel,
  unassignInventoryFromTrainingLevel,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";

export function TrainingLevelMaterialsPicker({
  trainingLevelId,
  disabled,
}: {
  trainingLevelId: number;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const { data: catalog = [], isLoading: isLoadingCatalog } = useAllInventory(
    hasRequested,
  );
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useInventoryItemsForTrainingLevel(trainingLevelId, hasRequested);

  const assignedIds = new Set(assigned.map((item) => item.id));

  const handleRemove = async (inventoryId: number) => {
    try {
      await unassignInventoryFromTrainingLevel(trainingLevelId, inventoryId);
      toast({ title: "Removed from training level" });
      await refetchAssigned();
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">{assigned.length} linked</span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Manage materials"
            aria-label="Manage materials"
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Level Materials</DialogTitle>
                <DialogDescription>
                  Add and remove inventory items for this CI training level.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Section 1: Already linked */}
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Linked items</div>
                  {isLoadingAssigned || isLoadingCatalog ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked items.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1 font-normal"
                        >
                          <span className="max-w-[220px] truncate">{item.name}</span>
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded-sm px-1 text-gray-500 hover:bg-muted hover:text-destructive disabled:opacity-50"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => void handleRemove(item.id)}
                          >
                            x
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sections 2 + 3: Pending selections + catalog */}
                <InventoryCheckboxLinkPanel
                  key={trainingLevelId}
                  linkedInventoryIds={assignedIds}
                  catalogItems={catalog}
                  isCatalogLoading={isLoadingCatalog}
                  onSave={async (items) => {
                    const { assigned: count, failed } =
                      await bulkAssignInventoryToTrainingLevel(trainingLevelId, items);
                    await invalidateTrainingLevelItems(trainingLevelId);
                    await refetchAssigned();
                    if (failed.length > 0) {
                      toast({
                        title: `${count} linked, ${failed.length} failed`,
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: `${items.length} item${items.length !== 1 ? "s" : ""} linked to training level`,
                      });
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
```

Key changes from the original:
- Removed: `useMemo`, `Select*` imports, `selectedItemId` state, `handleAdd` function, `available` memo, `catalogEmpty` variable
- Added: `bulkAssignInventoryToTrainingLevel`, `invalidateTrainingLevelItems`, `InventoryCheckboxLinkPanel` imports
- `assignedIds` is now inline `new Set(...)` (no `useMemo` needed since the panel also filters)
- Section 1 (linked items badges) unchanged
- Section 2+3 handled by `<InventoryCheckboxLinkPanel key={trainingLevelId} ...>`

- [ ] **Step 7.1 — Write the updated file** (full content above)

- [ ] **Step 7.2 — Verify TypeScript**

  ```bash
  cd C:\Users\Administrator\Desktop\IPA\IPA-frontend && npx tsc --noEmit
  ```

  Expected: no errors in the modified file.

- [ ] **Step 7.3 — Commit**

  ```bash
  git add app/admin/training-levels/TrainingLevelMaterialsPicker.tsx
  git commit -m "feat(inventory): replace Select+Add with InventoryCheckboxLinkPanel in TrainingLevelMaterialsPicker"
  ```

---

## Verification Checklist

Run through this after all tasks complete:

- [ ] **Panel pending list**: Check 3 items in any panel → emerald-tinted "3 selected" box appears above search with names + qty inputs. Click × on one → box updates to "2 selected", checkbox in catalog becomes unchecked.
- [ ] **Panel save flow**: Check items → Save Changes → pending box disappears, catalog resets, parent refetches and shows new linked items.
- [ ] **Section order (Operations)**: Admin → Operations → Inventory → select program + level → assigned items grid appears ABOVE the dashed panel.
- [ ] **Section order (ProgramKit)**: Admin → Profile → Programs → expand program → assigned items table is above the panel (already correct from v1; verify no regression).
- [ ] **CI training level dialog**: Admin → Training Levels → click "+" on any row → dialog opens → "Linked items" section at top → checkbox panel below. Check items → pending list appears → Save → items appear in linked badges.
- [ ] **CI training level backend**: POST to `/inventory/training-level/:id/items/bulk-assign` with `{ items: [{inventoryId: N, defaultQuantity: 1}] }` returns `{ assigned: 1, failed: [] }`.
- [ ] **Partial failure toast**: If backend returns `failed: [id]`, destructive toast shows "N linked, M failed".
- [ ] **TypeScript**: `npx tsc --noEmit` in `IPA-frontend` reports only the pre-existing 7 unrelated errors.
