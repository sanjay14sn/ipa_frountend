"use client";

import { useQuery } from "@tanstack/react-query";
import { getRegions } from "@/services/region-tracking.service";
import { queryKeys } from "./query-keys";

export function useRegions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.regionTracking.regions,
    queryFn: getRegions,
    enabled,
  });
}
