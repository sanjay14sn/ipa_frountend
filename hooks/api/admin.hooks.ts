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
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.listPrefix });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.listPrefix });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.detail(admin.id),
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
