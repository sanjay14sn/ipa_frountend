"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminOperationsMonitoring } from "@/services/operations-monitoring.service";
import { queryKeys } from "./query-keys";

export function useAdminOperationsMonitoring(opts?: {
  regionAdminId?: number;
  regionLocationId?: number;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.operations.monitoring,
      opts?.regionAdminId ?? null,
      opts?.regionLocationId ?? null,
    ],
    queryFn: () => getAdminOperationsMonitoring(opts),
    staleTime: 30 * 1000,
  });
}
