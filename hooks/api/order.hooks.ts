"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getFranchiseeOrders,
  getAllOrdersAdmin,
  getAdminOrdersFlat,
  getOrderById,
  getOrderByIdAdmin,
  getAvailableItemsForStudents,
  getAvailableItemsForStudentsAdmin,
  createOrderAdmin,
  type OrderData,
  type GroupedOrdersResponse,
  type FranchiseeOrderListParams,
  type StudentAvailableItems,
} from "@/services/order.service";
import { useProgramId } from "@/hooks/use-scope";
import { extractErrorMessage } from "@/lib/error-utils";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useFranchiseeOrders(
  params?: FranchiseeOrderListParams,
  enabled = true,
) {
  const programId = useProgramId();
  const scopedParams: FranchiseeOrderListParams = {
    ...params,
    programId: params?.programId ?? programId ?? undefined,
  };
  const q = useQuery({
    queryKey: queryKeys.orders.franchisee(
      scopedParams as Record<string, unknown> | undefined,
    ),
    queryFn: () => getFranchiseeOrders(scopedParams),
    enabled,
    placeholderData: (prev) => prev,
  });
  return {
    orders: q.data ?? ([] as OrderData[]),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function useAdminOrders(
  params?: Parameters<typeof getAllOrdersAdmin>[0],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.orders.admin(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getAllOrdersAdmin(params),
    enabled: options?.enabled ?? true,
    placeholderData: (prev) => prev as GroupedOrdersResponse["result"] | undefined,
  });
}

export function useAdminOrderRows(
  params?: Parameters<typeof getAdminOrdersFlat>[0],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.orders.admin(
      { ...(params as Record<string, unknown> | undefined), flat: true } as Record<
        string,
        unknown
      >,
    ),
    queryFn: () => getAdminOrdersFlat(params),
    enabled: options?.enabled ?? true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) =>
      prev as
        | Awaited<ReturnType<typeof getAdminOrdersFlat>>
        | undefined,
  });
}

export function useOrderById(orderId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.franchiseeDetail(orderId ?? 0),
    queryFn: () => getOrderById(orderId!),
    enabled: orderId != null && orderId > 0,
  });
}

export function useOrderByIdAdmin(orderId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.adminDetail(orderId ?? 0),
    queryFn: () => getOrderByIdAdmin(orderId!),
    enabled: orderId != null && orderId > 0,
  });
}

/**
 * Fetches the custom-orderable items (level-template + program-kit items) for
 * the given students. Backs the Custom Materials picker. Disabled when no
 * students are selected.
 */
export function useAvailableItems(studentIds: number[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.availableItems(studentIds),
    queryFn: () => getAvailableItemsForStudents(studentIds),
    enabled: enabled && studentIds.length > 0,
    placeholderData: (prev) => prev as StudentAvailableItems[] | undefined,
  });
}

/** Admin variant of useAvailableItems, scoped to the target franchise
 * (admin create-on-behalf order flow). */
export function useAdminAvailableItems(
  franchiseId: string | null,
  studentIds: number[],
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.orders.availableItemsAdmin(franchiseId ?? "", studentIds),
    queryFn: () => getAvailableItemsForStudentsAdmin(franchiseId!, studentIds),
    enabled: enabled && !!franchiseId && studentIds.length > 0,
    placeholderData: (prev) => prev as StudentAvailableItems[] | undefined,
  });
}

/** Admin create-on-behalf order — no payment step; the order lands PAID and
 * allocates immediately. */
export function useCreateOrderAdminMutation() {
  return useMutation({
    mutationFn: (payload: Parameters<typeof createOrderAdmin>[0]) =>
      createOrderAdmin(payload),
    onSuccess: async () => {
      await invalidateAdminOrders();
      toast.success("Order created — no payment required");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create order"));
    },
  });
}

export async function invalidateFranchiseeOrders() {
  try {
    const client = getQueryClientBridge();
    await client.invalidateQueries({
      queryKey: queryKeys.orders.franchiseeListPrefix,
    });
    await client.invalidateQueries({
      queryKey: queryKeys.orders.franchiseeDetailPrefix,
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateAdminOrders() {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.orders.adminListPrefix,
    });
  } catch {
    /* ignore */
  }
}

