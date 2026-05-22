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
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
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
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function useKitCatalog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.kitCatalog,
    queryFn: getKitCatalogItems,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function useProgramKitItems(programId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.programKitItems(programId ?? 0),
    queryFn: () => getProgramKitItems(programId!),
    enabled: enabled && programId != null && programId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
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
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
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
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export async function invalidateInventoryAdminLists() {
  try {
    const qc = getQueryClientBridge();
    await qc.invalidateQueries({ queryKey: ["inventory", "list"] });
    await qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring });
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate the caches that can change as a side-effect of a manual
 * stock adjustment. A positive adjustment can flip backordered order
 * lines to ALLOCATED (which also flips CI material orders attached to
 * CI training sessions), so we need to refresh the inventory list AND
 * any view of orders / CI training that the user might switch to.
 */
export async function invalidateAfterStockAdjustment() {
  try {
    const qc = getQueryClientBridge();
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["inventory", "list"] }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      // Admin & franchisee order lists / details — backorder fulfillment
      // changes allocationStatus on affected orders.
      qc.invalidateQueries({ queryKey: ["orders-admin", "list"] }),
      qc.invalidateQueries({ queryKey: ["orders-franchisee", "list"] }),
      qc.invalidateQueries({ queryKey: ["orders", "admin"] }),
      qc.invalidateQueries({ queryKey: ["orders", "franchisee"] }),
      // CI training views surface CI-material order allocation state.
      qc.invalidateQueries({ queryKey: queryKeys.courseInstructors.ciTraining }),
      qc.invalidateQueries({
        queryKey: queryKeys.courseInstructors.trainingList,
      }),
      // Operations monitoring may show backorder counts.
      qc.invalidateQueries({ queryKey: queryKeys.operations.monitoring }),
    ]);
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
