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
  uploadMyProfilePhoto,
  removeMyProfilePhoto,
  uploadFranchiseePhotoAdmin,
  removeFranchiseePhotoAdmin,
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

/** One dropdown option per approved franchise (value = franchise UUID). */
export interface FranchiseOption {
  value: string;
  label: string;
}

/**
 * Approved franchises as `{value, label}` options for list filter dropdowns.
 * Capped at the backend's 100-row page limit — fine for the current network
 * size; revisit with a paged combobox if the network outgrows it.
 */
export function useFranchiseOptions() {
  return useQuery({
    queryKey: queryKeys.franchises.adminAll({ role: "filter-options" }),
    queryFn: async (): Promise<FranchiseOption[]> => {
      const res = await getPaginatedFranchises({
        page: 1,
        limit: 100,
        status: "Approved",
        sortBy: "name",
        sortOrder: "ASC",
      });
      return res.data.map((f) => ({
        value: String(f.id),
        label: f.name,
      }));
    },
    staleTime: 5 * 60 * 1000,
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

/**
 * Franchisee changes their own profile photo. Invalidating the
 * franchisee-profile prefix refetches /franchisee/auth/me, whose sync effect
 * in user-context refreshes `user.profile` (and thus the profile header).
 */
export function useMyProfilePhotoMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["auth", "franchisee-profile"],
    });
  };

  const upload = useMutation({
    mutationFn: ({ file }: { file: File }) => uploadMyProfilePhoto(file),
    onSuccess: () => {
      invalidate();
      toast.success("Photo updated");
    },
  });

  const remove = useMutation({
    mutationFn: () => removeMyProfilePhoto(),
    onSuccess: () => {
      invalidate();
      toast.success("Photo removed");
    },
  });

  return { upload, remove };
}

/** Admin changes a franchisee's profile photo from the franchise detail page. */
export function useFranchiseePhotoAdminMutations() {
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: ({
      franchiseeId,
      file,
    }: {
      franchiseeId: number;
      file: File;
    }) => uploadFranchiseePhotoAdmin(franchiseeId, file),
    onSuccess: () => {
      invalidateAdminFranchiseViews(queryClient);
      toast.success("Photo updated");
    },
  });

  const remove = useMutation({
    mutationFn: ({ franchiseeId }: { franchiseeId: number }) =>
      removeFranchiseePhotoAdmin(franchiseeId),
    onSuccess: () => {
      invalidateAdminFranchiseViews(queryClient);
      toast.success("Photo removed");
    },
  });

  return { upload, remove };
}

