"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPendingFranchise,
  getPaginatedFranchises,
  getPaginatedFranchiseApplications,
  getPaginatedFranchiseesGrouped,
  getFranchiseStartingKits,
  updateFranchiseAdmin,
  updateFranchiseeAdmin,
  type FranchiseData,
  type FranchiseeGroupedItem,
  type FranchiseStartingKitRow,
  type PaginationParams,
  type PaginatedFranchiseeGroupedResponse,
  type PaginatedFranchisesResponse,
  type UpdateFranchiseAdminRequest,
  type UpdateFranchiseeAdminRequest,
} from "@/services/franchisee.service";
import { queryKeys } from "./query-keys";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

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
  return useQuery({
    queryKey: queryKeys.franchises.adminAll(params as Record<string, unknown>),
    queryFn: () => getPaginatedFranchises(params),
    enabled,
    placeholderData: (prev) => prev as PaginatedFranchisesResponse | undefined,
  });
}

export function usePaginatedFranchiseApplicationsAdmin(
  params: PaginationParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.franchiseApplications.list(params as Record<string, unknown>),
    queryFn: () => getPaginatedFranchiseApplications(params),
    enabled,
    placeholderData: (prev) => prev as PaginatedFranchisesResponse | undefined,
  });
}

function usePaginatedFranchiseesGrouped(
  params: PaginationParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.franchises.groupedByFranchisee(params as Record<string, unknown>),
    queryFn: () => getPaginatedFranchiseesGrouped(params),
    enabled,
    placeholderData: (prev) =>
      prev as PaginatedFranchiseeGroupedResponse | undefined,
  });
}

function useFranchiseStartingKits(
  franchiseId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.franchises.startingKits(franchiseId ?? ""),
    queryFn: () => getFranchiseStartingKits(franchiseId!),
    enabled: Boolean(franchiseId) && enabled,
  });
}

/** Every admin list variant embeds franchise + franchisee rows, plus the detail page's own key. */
function invalidateAdminFranchiseViews(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ["franchises-admin", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["franchises-grouped", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["franchise-applications", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["admin-franchise-detail"] });
}

export function useUpdateFranchiseAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      franchiseId,
      payload,
    }: {
      franchiseId: string;
      payload: UpdateFranchiseAdminRequest;
    }) => updateFranchiseAdmin(franchiseId, payload),
    onSuccess: () => {
      invalidateAdminFranchiseViews(queryClient);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateFranchiseeAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      franchiseeId,
      payload,
    }: {
      franchiseeId: number;
      payload: UpdateFranchiseeAdminRequest;
    }) => updateFranchiseeAdmin(franchiseeId, payload),
    onSuccess: () => {
      invalidateAdminFranchiseViews(queryClient);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

