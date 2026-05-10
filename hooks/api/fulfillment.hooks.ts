"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminShipments,
  type ShipmentListParams,
} from "@/services/fulfillment.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useAdminShipments(
  params?: ShipmentListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.fulfillment.shipments(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getAdminShipments(params),
    enabled: options?.enabled ?? true,
    placeholderData: (prev) => prev,
  });
}

export async function invalidateAdminShipments() {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: ["shipments", "list"],
    });
  } catch {
    /* ignore */
  }
}
