"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getRegionDetail,
  getRegionSummaries,
} from "@/services/region-tracking.service";
import { queryKeys } from "./query-keys";

export function useRegionSummaries(enabled = true) {
  return useQuery({
    queryKey: queryKeys.regionTracking.regions,
    queryFn: getRegionSummaries,
    enabled,
  });
}

export function useRegionDetail(adminId: number | null) {
  return useQuery({
    queryKey:
      adminId != null
        ? queryKeys.regionTracking.detail(adminId)
        : (["region-tracking", "regions", "none"] as const),
    queryFn: () => getRegionDetail(adminId as number),
    enabled: adminId != null,
  });
}
