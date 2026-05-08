"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPendingFranchise,
  getPaginatedFranchises,
  getPaginatedFranchiseApplications,
  getPaginatedFranchiseesGrouped,
  getFranchiseStartingKits,
  type FranchiseData,
  type FranchiseeGroupedItem,
  type FranchiseStartingKitRow,
  type PaginationParams,
  type PaginatedFranchiseeGroupedResponse,
  type PaginatedFranchisesResponse,
} from "@/services/franchisee.service";
import { queryKeys } from "./query-keys";

export function usePendingFranchiseApplications(
  params?: PaginationParams,
  enabled = true,
) {
  const pendingParams = {
    ...params,
    status: 'Pending',
  };
  return useQuery({
    queryKey: queryKeys.franchiseApplications.pending(
      pendingParams as Record<string, unknown>,
    ),
    queryFn: async () => (await getPendingFranchise(pendingParams)).result ?? [],
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function usePaginatedFranchisesAdmin(
  params: PaginationParams,
  enabled = true,
) {
  const keyPayload: Record<string, unknown> = {
    route: "admin-franchise-all",
    ...params,
  };
  return useQuery({
    queryKey: queryKeys.franchises.list(keyPayload),
    queryFn: () => getPaginatedFranchises(params),
    enabled,
    placeholderData: (prev) => prev as PaginatedFranchisesResponse | undefined,
  });
}

export function usePaginatedFranchiseApplicationsAdmin(
  params: PaginationParams,
  enabled = true,
) {
  const keyPayload: Record<string, unknown> = {
    route: 'admin-franchise-applications',
    ...params,
  };
  return useQuery({
    queryKey: queryKeys.franchiseApplications.list(keyPayload),
    queryFn: () => getPaginatedFranchiseApplications(params),
    enabled,
    placeholderData: (prev) => prev as PaginatedFranchisesResponse | undefined,
  });
}

export function usePaginatedFranchiseesGrouped(
  params: PaginationParams,
  enabled = true,
) {
  const keyPayload: Record<string, unknown> = {
    route: "admin-franchise-by-franchisee",
    ...params,
  };
  return useQuery({
    queryKey: queryKeys.franchises.list(keyPayload),
    queryFn: () => getPaginatedFranchiseesGrouped(params),
    enabled,
    placeholderData: (prev) =>
      prev as PaginatedFranchiseeGroupedResponse | undefined,
  });
}

export function useFranchiseStartingKits(
  franchiseId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.franchises.startingKits(franchiseId ?? ""),
    queryFn: () => getFranchiseStartingKits(franchiseId!),
    enabled: Boolean(franchiseId) && enabled,
  });
}

export type { FranchiseData, FranchiseeGroupedItem, FranchiseStartingKitRow };
