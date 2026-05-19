"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPaginatedProgramRequestsAdmin,
  type PaginatedProgramRequestsResponse,
} from "@/services/program-request.service";
import { queryKeys } from "./query-keys";

interface ProgramRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  franchiseId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function usePaginatedProgramRequestsAdmin(
  params: ProgramRequestListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.programRequests.admin(
      params as Record<string, unknown>,
    ),
    queryFn: () => getPaginatedProgramRequestsAdmin(params),
    enabled,
    placeholderData: (prev) => prev as PaginatedProgramRequestsResponse | undefined,
  });
}
