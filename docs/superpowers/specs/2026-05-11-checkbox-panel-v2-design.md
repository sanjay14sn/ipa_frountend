# Design: Checkbox Panel v2 — Pending Selections + CI Training Level Wiring

**Date:** 2026-05-11  
**Status:** Approved

---

## Context

After the first build, the `InventoryCheckboxLinkPanel` lets users bulk-add inventory items via checkboxes. The UX gap: once you check several items in a long catalog list, you lose track of what's selected because checked items stay buried in the scrollable list.

This build adds a **three-section layout** and extends the panel to CI training levels.

---

## Three-Section Layout

Every inventory-linking view now has three sections in order:

```
┌────────────────────────────────────────┐
│  SECTION 1: Already linked             │
│  (rendered by parent — persisted data) │
│  Item A   qty [2]  [Save]  [×]         │
│  Item C   qty [1]  [Save]  [×]         │
├────────────────────────────────────────┤
│  SECTION 2: Newly selected  [Save (3)] │  ← inside InventoryCheckboxLinkPanel
│  Item F   qty [1]  [×]                 │
│  Item G   qty [2]  [×]                 │
│  Item H   qty [1]  [×]                 │
├────────────────────────────────────────┤
│  SECTION 3: Catalog (searchable)       │  ← inside InventoryCheckboxLinkPanel
│  [🔍 Search...                       ] │
│  [✓] Item F  SKU-006  Books            │
│  [ ] Item I  SKU-009  Apparel          │
│  [✓] Item G  SKU-007  Equipment        │
└────────────────────────────────────────┘
```

- **Section 1** — already-persisted links. Each parent component renders this (unchanged code). Order correction needed in `inventory-section.tsx` (currently has sections reversed).
- **Section 2** — inside `InventoryCheckboxLinkPanel`. Shows pending additions (checked but unsaved). Appears only when ≥1 item is checked. × removes item from pending AND unchecks it in Section 3. Qty input syncs with Section 3's inline qty input (same `pendingAdditions` state).
- **Section 3** — inside `InventoryCheckboxLinkPanel`. The searchable checkbox catalog. Already-linked items (from `linkedInventoryIds` prop) are excluded. Checking promotes to Section 2.

---

## Changes to `InventoryCheckboxLinkPanel`

### New Section 2 UI (inside the panel, above search)

Rendered only when `pendingCount > 0`:

```tsx
<div className="mb-3 rounded-lg border bg-emerald-50/40 p-3">
  <div className="mb-2 text-xs font-medium text-emerald-900">
    {pendingCount} selected — not yet saved
  </div>
  {Object.entries(pendingAdditions).map(([idStr, qty]) => {
    const id = Number(idStr);
    const item = catalogItems.find((c) => c.id === id);
    if (!item) return null;
    return (
      <div key={id} className="flex items-center gap-2 py-1">
        <span className="flex-1 truncate text-sm font-medium">{item.name}</span>
        <Input type="number" min="1" value={String(qty)}
          onChange={(e) => setQuantity(id, e.target.value)}
          className="h-7 w-16 text-sm" />
        <button onClick={() => toggleItem(id)} aria-label={`Remove ${item.name}`}
          className="text-gray-400 hover:text-destructive">×</button>
      </div>
    );
  })}
</div>
```

No new props required — `catalogItems` is already passed and contains the item details needed to render names in Section 2.

### Props: no change

```typescript
interface InventoryCheckboxLinkPanelProps {
  linkedInventoryIds: Set<number>;     // already-linked (excluded from catalog)
  catalogItems: InventoryItemSummary[]; // full catalog
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
}
```

---

## Section Order Fix: `inventory-section.tsx`

Currently the level-template assignments card renders:
1. `<InventoryCheckboxLinkPanel>` (Sections 2+3)
2. Assigned-items grid (Section 1) ← wrong order

Fix: swap so assigned-items grid renders **before** the panel.

---

## CI Training Level Wiring

### Backend additions (ipa-new)

**New DTO:** `bulk-assign-training-level-item.dto.ts`
```typescript
class BulkAssignTrainingLevelItemEntryDto {
  @IsInt() @Min(1) inventoryId: number;
  @IsOptional() @IsInt() @Min(1) defaultQuantity?: number;
}
export class BulkAssignTrainingLevelItemDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => BulkAssignTrainingLevelItemEntryDto)
  items: BulkAssignTrainingLevelItemEntryDto[];
}
```

**New service method** in `inventory-query.service.ts`:
```typescript
async bulkAssignTrainingLevelItems(trainingLevelId, items[])
  → delegates to existing replaceTrainingLevelTemplate per item via Promise.allSettled
  → returns { assigned: number; failed: number[] }
```

**New endpoint** in `admin-auth.controller.ts`:
```
POST /inventory/training-level/:trainingLevelId/items/bulk-assign
Body: { items: [{inventoryId, defaultQuantity?}] }
```

### Frontend additions

**`inventory.service.ts`:** Add `bulkAssignInventoryToTrainingLevel(trainingLevelId, items[])` calling the new endpoint.

**`inventory.hooks.ts`:** Add `invalidateTrainingLevelItems(trainingLevelId)` using `queryKeys.inventory.trainingLevelItems(trainingLevelId)`.

### `TrainingLevelMaterialsPicker.tsx` — dialog upgrade

Keep the dialog structure (compact "+" button opens dialog). Inside the dialog:
- Section 1: Keep the existing "Linked items" badges (with × to remove each) — unchanged
- Replace the Select+Add grid with `<InventoryCheckboxLinkPanel>` wired to `bulkAssignInventoryToTrainingLevel`

Key: `useAllInventory(hasRequested)` stays lazy (only loads when dialog opens). Panel receives `catalogItems={catalog}` and `isCatalogLoading={isLoadingCatalog}`.

---

## Files Affected

| File | Change |
|------|--------|
| `IPA-frontend/components/inventory/InventoryCheckboxLinkPanel.tsx` | Add Section 2 pending-list above search |
| `IPA-frontend/app/admin/operations/components/legacy-tabs/inventory-section.tsx` | Swap section order (Section 1 above panel) |
| `ipa-new/…/dto/bulk-assign-training-level-item.dto.ts` | New file |
| `ipa-new/…/services/inventory-query.service.ts` | Add `bulkAssignTrainingLevelItems` |
| `ipa-new/…/controllers/admin-auth.controller.ts` | Add bulk endpoint |
| `IPA-frontend/services/inventory.service.ts` | Add `bulkAssignInventoryToTrainingLevel` |
| `IPA-frontend/hooks/api/inventory.hooks.ts` | Add `invalidateTrainingLevelItems` |
| `IPA-frontend/app/admin/training-levels/TrainingLevelMaterialsPicker.tsx` | Replace Select+Add with panel |

---

## Verification

1. **Panel pending list**: Check 3 items → Section 2 appears with their names and qty inputs. × on one → removes from Section 2 and unchecks in Section 3. Save Changes sends exactly those items.
2. **Section order**: In Operations → Inventory → select level → assigned items grid appears ABOVE the panel.
3. **ProgramKitManagement**: Assigned items table (Section 1) is above panel (Sections 2+3) — already correct, verify it still works.
4. **CI training level dialog**: Open "+" in training-levels page → dialog shows Linked items badges → checkbox panel below. Bulk-select items → save → items appear in linked badges.
5. **Partial failure**: If some items fail, toast shows "N assigned, M failed" in destructive style.
