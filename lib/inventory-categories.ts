/**
 * Canonical list of inventory item categories.
 *
 * Mirror of `ipa-new/src/shared-kernel/enums/inventory-category.enum.ts`.
 * Used to populate category dropdowns and validate selections client-side.
 */
export const INVENTORY_CATEGORIES = [
  "Books",
  "T-Shirts",
  "Bags & Kits",
  "Equipment",
  "Stationery",
  "Flash Cards",
  "Performance Cards",
  "Question Papers",
  "Forms & Documents",
] as const;

export type InventoryCategoryName = (typeof INVENTORY_CATEGORIES)[number];

export function isInventoryCategory(value: unknown): value is InventoryCategoryName {
  return (
    typeof value === "string" &&
    (INVENTORY_CATEGORIES as readonly string[]).includes(value)
  );
}
