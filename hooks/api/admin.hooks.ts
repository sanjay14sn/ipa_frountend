"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdmin,
  getPaginatedAdmins,
  updateAdmin,
  type AdminListParams,
  type CreateAdminRequest,
  type UpdateAdminRequest,
} from "@/services/admin.service";
import { queryKeys } from "./query-keys";

export const ADMIN_LIST_PREFIX = ["admin-users", "list"] as const;

export function usePaginatedAdmins(
  params?: AdminListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.admin.list(params as Record<string, unknown>),
    queryFn: () => getPaginatedAdmins(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminRequest) => createAdmin(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LIST_PREFIX });
    },
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      adminId,
      payload,
    }: {
      adminId: number;
      payload: UpdateAdminRequest;
    }) => updateAdmin(adminId, payload),
    onSuccess: (admin) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LIST_PREFIX });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.detail(admin.id),
      });
    },
  });
}
