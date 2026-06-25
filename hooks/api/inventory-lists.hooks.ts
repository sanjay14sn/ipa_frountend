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
import { queryKeys } from "@/hooks/api/query-keys";

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
  /** Super-admin region view: scope to this warehouse location. */
  regionLocationId?: number;
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
  if (filters.regionLocationId !== undefined) {
    params.regionLocationId = filters.regionLocationId;
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
        regionLocationId: filters.regionLocationId,
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

function useInventoryMonitoring() {
  return useQuery({
    queryKey: queryKeys.inventory.monitoring,
    queryFn: () => getInventoryMonitoring(),
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

export type { ProgramKitItemSummary };
