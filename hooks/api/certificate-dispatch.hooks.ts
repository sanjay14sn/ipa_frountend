"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  previewBulkDispatchPdf,
  confirmBulkDispatch,
  getDispatchEligibleCertificates,
} from "@/services/student.service";

export function usePreviewBulkDispatch() {
  return useMutation({ mutationFn: (ids: number[]) => previewBulkDispatchPdf(ids) });
}

export function useConfirmBulkDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ids: number[]; orderId?: number }) =>
      confirmBulkDispatch(vars.ids, vars.orderId),
    onSuccess: () => {
      // Match the keys invalidated by useBulkApproveCertificates so cert lists refresh.
      void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
      void qc.invalidateQueries({ queryKey: ["admin-cert-details"] });
      void qc.invalidateQueries({ queryKey: ["dispatch-eligible-certs"] });
      void qc.invalidateQueries({ queryKey: ["franchisee-certificates"] });
    },
  });
}

export function useDispatchEligibleCertificates(
  params: { franchiseId?: string; programId?: number; levelId?: number; page?: number; limit?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["dispatch-eligible-certs", params],
    queryFn: () => getDispatchEligibleCertificates(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}
