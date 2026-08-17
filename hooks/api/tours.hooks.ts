"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markAdminTourComplete,
  markCITourComplete,
  markFranchiseeTourComplete,
  type CompleteTourBody,
} from "@/services/tours.service";
import { sendClientLog } from "@/lib/client-telemetry";
import { queryKeys } from "./query-keys";

export type TourPortal = "admin" | "franchisee" | "ci";

/**
 * Marks a guided tour complete for the current user. Fail-open by design
 * (docs/guided-tours/): a failed write is logged, never surfaced — the
 * in-memory session flag in use-guided-tour keeps the tour from re-blocking
 * this session, and the worst case is one more auto-offer next login.
 */
export function useMarkTourComplete(portal: TourPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: (body: CompleteTourBody) => {
      if (portal === "admin") return markAdminTourComplete(body);
      if (portal === "franchisee") return markFranchiseeTourComplete(body);
      return markCITourComplete(body);
    },
    onSuccess: () => {
      // CI state lives in CIAuthContext (refreshed by the caller); the two
      // react-query profiles refetch so `toursCompleted` stays in sync.
      if (portal === "admin") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.auth.adminProfile(),
        });
      } else if (portal === "franchisee") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.auth.franchiseeProfile(),
        });
      }
    },
    onError: (error, body) => {
      sendClientLog({
        level: "warn",
        event: "tour-complete-failed",
        message: "Failed to persist guided-tour completion",
        context: { portal, tourKey: body.tourKey, error },
      });
    },
  });
}
