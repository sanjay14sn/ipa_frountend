"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminOperationsMonitoring } from "@/services/operations-monitoring.service";
import { queryKeys } from "./query-keys";

export function useAdminOperationsMonitoring() {
  return useQuery({
    queryKey: queryKeys.operations.monitoring,
    queryFn: getAdminOperationsMonitoring,
    staleTime: 30 * 1000,
  });
}
