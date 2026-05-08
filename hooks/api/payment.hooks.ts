"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminFranchisePaymentSummaries,
  getAdminFranchisePayments,
  getPaginatedAdminPayments,
} from "@/services/payment.service";
import { queryKeys } from "./query-keys";

export function useAdminPaymentsPaginated(params: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.payments.adminPaginated(params),
    queryFn: () => getPaginatedAdminPayments(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminFranchisePaymentSummaries(params: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.payments.adminSummaries(params),
    queryFn: () => getAdminFranchisePaymentSummaries(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminFranchisePayments(
  franchiseId: string | null | undefined,
  params: Record<string, unknown>,
) {
  return useQuery({
    queryKey: queryKeys.payments.franchisePayments(franchiseId ?? "", params),
    queryFn: () => getAdminFranchisePayments(franchiseId!, params),
    enabled: !!franchiseId,
    placeholderData: (prev) => prev,
  });
}
