"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import {
  getEligibleCourseInstructorsForCertificate,
} from "@/services/course-instructor.service";

/**
 * Query hook for eligible course instructors for a certificate request.
 * Replaces the manual useEffect + cancelled flag in both certificate request modals.
 *
 * @param levelIds - Array of level IDs to check eligibility against (typically one for
 *   single-student requests, or multiple for bulk requests).
 * @param programId - Optional program ID to narrow the eligible instructor list.
 */
export function useEligibleCourseInstructorsForCertificate(
  levelIds: number[],
  programId?: number,
) {
  return useQuery({
    queryKey: queryKeys.certificates.eligibleInstructors(levelIds, programId),
    queryFn: () =>
      getEligibleCourseInstructorsForCertificate(levelIds, programId),
    enabled: levelIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min — this list rarely changes
    refetchOnWindowFocus: false,
  });
}
