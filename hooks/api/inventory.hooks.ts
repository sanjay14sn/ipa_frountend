"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllInventory,
  getKitCatalogItems,
  getProgramKitItems,
  getInventoryItemsForLevel,
  getInventoryItemsForTrainingLevel,
  getInventoryMonitoring,
  getPaginatedInventory,
  type Inventory,
  type ProgramKitItemSummary,
} from "@/services/inventory.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

/**
 * Reference-data queries that almost never change (programs, kits, level kits).
 * Infinite stale-time means React Query never considers the data stale on its
 * own; 30-minute GC time keeps it in memory for a full working session without
 * leaking indefinitely.
 */
const STATIC_REFERENCE_OPTIONS = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

export type InventoryPaginatedFilters = {
  page: number;
  limit: number;
  search?: string;
  programId?: number;
  levelId?: number;
  status?: string;
  category?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: string;
};

function listParamsFromFilters(
  filters: InventoryPaginatedFilters,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
    sortBy: filters.sortBy ?? "name",
    sortOrder: filters.sortOrder ?? "ASC",
  };
  if (filters.search !== undefined && filters.search !== "") {
    params.search = filters.search;
  }
  if (filters.programId !== undefined) params.programId = filters.programId;
  if (filters.levelId !== undefined) params.levelId = filters.levelId;
  if (filters.status !== undefined && filters.status !== "") {
    params.status = filters.status;
  }
  if (filters.category !== undefined && filters.category !== "") {
    params.category = filters.category;
  }
  if (filters.lowStock) {
    params.lowStock = true;
  }
  return params;
}

export function useInventoryPaginatedQuery(filters: InventoryPaginatedFilters) {
  const queryKey = queryKeys.inventory.adminList(listParamsFromFilters(filters));

  const q = useQuery({
    queryKey,
    queryFn: () =>
      getPaginatedInventory({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        programId: filters.programId,
        levelId: filters.levelId,
        status: filters.status,
        category: filters.category || undefined,
        lowStock: filters.lowStock ? true : undefined,
        sortBy: filters.sortBy ?? "name",
        sortOrder: filters.sortOrder ?? "ASC",
      }),
    ...STATIC_REFERENCE_OPTIONS,
    placeholderData: (prev) => prev,
  });

  return {
    ...q,
    rows: q.data?.rows ?? [],
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
  };
}

export function useInventoryMonitoring() {
  return useQuery({
    queryKey: queryKeys.inventory.monitoring,
    queryFn: getInventoryMonitoring,
  });
}

export function useAllInventory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: getAllInventory,
    enabled,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export function useKitCatalog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.kitCatalog,
    queryFn: getKitCatalogItems,
    enabled,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export function useProgramKitItems(programId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.programKitItems(programId ?? 0),
    queryFn: () => getProgramKitItems(programId!),
    enabled: enabled && programId != null && programId > 0,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export function useInventoryItemsForLevel(
  levelId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.inventory.levelItems(levelId ?? 0),
    queryFn: () => getInventoryItemsForLevel(levelId!),
    enabled: enabled && levelId != null && levelId > 0,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export function useInventoryItemsForTrainingLevel(
  trainingLevelId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.inventory.trainingLevelItems(trainingLevelId ?? 0),
    queryFn: () => getInventoryItemsForTrainingLevel(trainingLevelId!),
    enabled: enabled && trainingLevelId != null && trainingLevelId > 0,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export async function invalidateInventoryAdminLists() {
  try {
    const qc = getQueryClientBridge();
    await qc.invalidateQueries({ queryKey: queryKeys.inventory.listPrefix });
    await qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring });
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate the caches that can change as a side-effect of a manual
 * stock adjustment.
 *
 * @param materialId  The inventory item that was adjusted. Its detail cache
 *   is invalidated first (most targeted). If omitted, only the broad list
 *   keys are refreshed.
 *
 * Cross-domain ripples (intentional):
 *   - Orders: a positive adjustment can flip backordered order lines to
 *     ALLOCATED, changing `allocationStatus` visible in admin/franchisee order
 *     lists and detail pages.
 *   - CI training: CI-material orders are linked to training sessions, so their
 *     allocation state changes too.
 *   - Operations monitoring: shows backorder counts which change on adjustment.
 *
 * These cannot be scoped narrower without a backend change that returns the
 * affected order/session IDs in the stock-adjustment response.
 */
export async function invalidateAfterStockAdjustment(materialId?: number) {
  try {
    const qc = getQueryClientBridge();
    const tasks: Promise<void>[] = [
      // --- Inventory-scoped (most targeted) ---
      qc.invalidateQueries({ queryKey: queryKeys.inventory.listPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    ];

    // Invalidate the specific item's detail cache when we know which item
    // was adjusted — avoids re-fetching every detail page on the next render.
    if (materialId != null) {
      tasks.push(
        qc.invalidateQueries({
          queryKey: queryKeys.inventory.detail(materialId),
        }),
      );
    }

    // --- Cross-domain (see JSDoc above) ---
    tasks.push(
      // Admin & franchisee order lists / details.
      qc.invalidateQueries({ queryKey: queryKeys.orders.adminListPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.franchiseeListPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.adminDetailPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.franchiseeDetailPrefix }),
      // CI training views surface CI-material order allocation state.
      qc.invalidateQueries({ queryKey: queryKeys.courseInstructors.ciTraining }),
      qc.invalidateQueries({
        queryKey: queryKeys.courseInstructors.trainingList,
      }),
      // Operations monitoring may show backorder counts.
      qc.invalidateQueries({ queryKey: queryKeys.operations.monitoring }),
    );

    await Promise.all(tasks);
  } catch {
    /* ignore */
  }
}

export async function invalidateProgramKitItems(programId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.programKitItems(programId),
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateLevelItems(levelId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.levelItems(levelId),
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateTrainingLevelItems(trainingLevelId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.trainingLevelItems(trainingLevelId),
    });
  } catch {
    /* ignore */
  }
}

export type { Inventory };
export type { ProgramKitItemSummary };
