# Design: Bulk Inventory Linking via Checkbox Panel

**Date:** 2026-05-11  
**Status:** Approved

---

## Context

Linking inventory items to a Program Kit or Level currently requires a one-item-at-a-time flow:
1. Click to open a popover/combobox
2. Pick one item
3. Set a quantity
4. Click "Add to kit"

This is slow when multiple items need to be linked at once. The goal is to replace this with a checkbox-based multi-select panel where the user can tick multiple items, set quantities inline, and save everything in a single bulk operation. The save button is only visible when there are pending changes, and only newly-checked items are sent to the backend.

---

## What Changes

### What stays the same
- Existing linked items list (table/grid)
- Per-row delete/unlink button
- Per-row inline quantity editing (existing rows)

### What changes
- The "add one item at a time" widget (popover + combobox + "Add to kit" button) is replaced by `InventoryCheckboxLinkPanel` in both `ProgramKitManagement` and `InventorySection`.

---

## New Component: `InventoryCheckboxLinkPanel`

### Props

```typescript
interface InventoryCheckboxLinkPanelProps {
  linkedInventoryIds: Set<number>;          // IDs already linked (to filter out)
  catalogItems: InventoryItemSummary[];     // Full catalog to show as checkboxes
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
}
```

The component is purely presentational — the parent supplies catalog data and handles save.

### UI Layout

```
[🔍 Search items...                      ]
──────────────────────────────────────────
[ ] Item A   SKU-001   Footwear
[ ] Item B   SKU-002   Apparel
[✓] Item C   SKU-003   Equipment   [qty: 2]
[ ] Item D   SKU-004   Footwear
──────────────────────────────────────────
                       [Save Changes (1)]
```

### Behavior

| Action | Effect |
|--------|--------|
| Check an item | Adds `{ inventoryId, quantity: 1 }` to `pendingAdditions` |
| Uncheck before save | Removes from `pendingAdditions` |
| Change qty input | Updates `pendingAdditions[inventoryId]` |
| `pendingAdditions` non-empty | "Save Changes (N)" button appears |
| Click Save | Calls `onSave` with only `pendingAdditions` entries; resets state |
| No pending items | Save button is hidden entirely |

### Internal State

```typescript
const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>({});
// key = inventoryId, value = quantity
const [search, setSearch] = useState("");
const [isSaving, setIsSaving] = useState(false);

const isDirty = Object.keys(pendingAdditions).length > 0;
```

### Payload (dirty-only)

```typescript
const items = Object.entries(pendingAdditions).map(([id, qty]) => ({
  inventoryId: Number(id),
  quantity: qty,
}));
// Only newly-checked items go to backend — existing linked items are never included.
```

---

## Backend: New Bulk-Assign Endpoints

### 1. Program Kit bulk assign

```
POST /inventory/program/:programId/kit-items/bulk-assign
Body: { items: Array<{ inventoryId: number; quantity?: number }> }
```

### 2. Level template bulk assign

```
POST /inventory/level/:levelId/items/bulk-assign
Body: { items: Array<{ inventoryId: number; quantity?: number }> }
```

**Implementation:** Each service method iterates over the items array and delegates to the existing single-assign logic (within a transaction). No existing endpoints change.

---

## Files Affected

### New files
- `IPA-frontend/components/inventory/InventoryCheckboxLinkPanel.tsx`

### Modified files

| File | Change |
|------|--------|
| `IPA-frontend/services/inventory.service.ts` | Add `bulkAssignInventoryToProgramKit`, `bulkAssignInventoryToLevel` |
| `IPA-frontend/app/admin/profile/components/ProgramKitManagement.tsx` | Replace popover-add widget with `InventoryCheckboxLinkPanel` |
| `IPA-frontend/app/admin/operations/components/legacy-tabs/inventory-section.tsx` | Replace single-item assign form with `InventoryCheckboxLinkPanel` |
| `ipa-new/src/…/controllers/admin-auth.controller.ts` | Add two bulk-assign endpoints |
| `ipa-new/src/…/services/inventory-query.service.ts` | Add bulk service methods |
| `ipa-new/src/…/dto/` (new DTOs) | `BulkAssignProgramKitDto`, `BulkAssignLevelDto` |

---

## Verification

1. Open Program Kit management → confirm checkbox list replaces old popover add widget.
2. Check 3 items, set different quantities → "Save Changes (3)" button appears.
3. Uncheck one before saving → button becomes "Save Changes (2)".
4. With nothing checked → Save button is absent from the DOM.
5. Click Save → inspect network request body: only 2 items in payload (not full catalog).
6. After save: newly linked items appear in the existing list above; pending state resets.
7. Repeat steps 1–6 for the Level linking panel in the Operations / Inventory section.
