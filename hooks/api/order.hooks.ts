"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getFranchiseeOrders,
  getAllOrdersAdmin,
  getAdminOrdersFlat,
  getOrderById,
  getOrderByIdAdmin,
  type OrderData,
  type GroupedOrdersResponse,
  type FranchiseeOrderListParams,
} from "@/services/order.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useFranchiseeOrders(
  params?: FranchiseeOrderListParams,
  enabled = true,
) {
  const q = useQuery({
    queryKey: queryKeys.orders.franchisee(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getFranchiseeOrders(params),
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

export function useAdminOrders(
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

export async function invalidateFranchiseeOrders() {
  try {
    const client = getQueryClientBridge();
    await client.invalidateQueries({
      queryKey: ["orders-franchisee", "list"],
    });
    await client.invalidateQueries({
      queryKey: ["orders", "franchisee"],
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateAdminOrders() {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: ["orders-admin", "list"],
    });
  } catch {
    /* ignore */
  }
}

export type { OrderData };
