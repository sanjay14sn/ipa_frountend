"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  attachCIFranchise,
  detachCIFranchise,
  listCIFranchises,
  transferCIHandler,
} from "@/services/course-instructor.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { ADMIN_CI_STATUS_PREFIX } from "@/hooks/api/ci.hooks";

/**
 * Multi-franchise CI membership (admin): the Franchises panel query and the
 * attach / detach / transfer mutations, sharing one invalidation set so every
 * surface that renders the CI's franchise, agreements, or receivables
 * refreshes after a membership change.
 */

/** Everything a membership change can go stale: CI lists (all admin tabs +
 *  the by-franchise order-dialog feed), the Franchises panel, both CI
 *  agreement admin surfaces, and the franchise-detail CI table/counts. */
function membershipInvalidationKeys(ciId: number): readonly (readonly unknown[])[] {
  return [
    [...ADMIN_CI_STATUS_PREFIX],
    queryKeys.courseInstructors.franchises(ciId),
    ["ci-agreements", "admin"],
    ["admin-ci-agreement"],
    ["admin-ci-franchise"],
    ["admin-ci-count"],
  ];
}

export function useCIFranchises(
  ciId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.courseInstructors.franchises(ciId ?? 0),
    queryFn: () => listCIFranchises(ciId as number),
    enabled: (options?.enabled ?? true) && ciId != null,
  });
}

export function useAttachCIFranchise(ciId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      franchiseId: string;
      tenure: number;
      agreementStartDate?: string;
    }) => attachCIFranchise(ciId, body),
    onSuccess: () => {
      for (const key of membershipInvalidationKeys(ciId)) {
        void queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    },
  });
}

export function useDetachCIFranchise(ciId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (franchiseId: string) => detachCIFranchise(ciId, franchiseId),
    onSuccess: () => {
      for (const key of membershipInvalidationKeys(ciId)) {
        void queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    },
  });
}

export function useTransferCIHandler(ciId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { franchiseId: string; tenure?: number }) =>
      transferCIHandler(ciId, body),
    onSuccess: () => {
      for (const key of membershipInvalidationKeys(ciId)) {
        void queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
      // The training-fee plan carries onto the new handler agreement.
      void queryClient.invalidateQueries({
        queryKey: ["ci-receivables", "admin", ciId],
      });
    },
  });
}
