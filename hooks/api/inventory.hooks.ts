/**
 * Re-export barrel — keeps existing import paths working.
 *
 * Query hooks (list, detail, reference data):
 *   @/hooks/api/inventory-lists.hooks
 *
 * Mutation / invalidation helpers:
 *   @/hooks/api/inventory-mutations.hooks
 */

export type { InventoryPaginatedFilters, Inventory, ProgramKitItemSummary } from "@/hooks/api/inventory-lists.hooks";
export {
  useInventoryPaginatedQuery,
  useAllInventory,
  useKitCatalog,
  useProgramKitItems,
  useInventoryItemsForLevel,
  useInventoryItemsForTrainingLevel,
} from "@/hooks/api/inventory-lists.hooks";

export {
  invalidateInventoryAdminLists,
  invalidateAfterStockAdjustment,
  invalidateProgramKitItems,
  invalidateLevelItems,
  invalidateTrainingLevelItems,
} from "@/hooks/api/inventory-mutations.hooks";
