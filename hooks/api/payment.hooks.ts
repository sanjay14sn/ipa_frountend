"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminFranchisePaymentSummaries,
  getAdminFranchisePayments,
  getPaginatedAdminPayments,
} from "@/services/payment.service";
import { queryKeys } from "./query-keys";

/**
 * Common query-parameter shape for paginated payment list endpoints.
 * Prefer this over the old `Record<string, unknown>` callers passed before.
 */
export interface PaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  franchiseId?: string | null;
}

export function useAdminPaymentsPaginated(params: PaymentListParams) {
  const p = params as Record<string, unknown>;
  return useQuery({
    queryKey: queryKeys.payments.adminPaginated(p),
    queryFn: () => getPaginatedAdminPayments(p),
    placeholderData: (prev) => prev,
  });
}

export function useAdminFranchisePaymentSummaries(params: PaymentListParams) {
  const p = params as Record<string, unknown>;
  return useQuery({
    queryKey: queryKeys.payments.adminSummaries(p),
    queryFn: () => getAdminFranchisePaymentSummaries(p),
    placeholderData: (prev) => prev,
  });
}

export function useAdminFranchisePayments(
  franchiseId: string | null | undefined,
  params: PaymentListParams,
) {
  const p = params as Record<string, unknown>;
  return useQuery({
    queryKey: queryKeys.payments.franchisePayments(franchiseId ?? "", p),
    queryFn: () => getAdminFranchisePayments(franchiseId!, p),
    enabled: !!franchiseId,
    placeholderData: (prev) => prev,
  });
}
