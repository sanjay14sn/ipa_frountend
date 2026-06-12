"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  previewBulkDispatchPdf,
  confirmBulkDispatch,
  getDispatchEligibleCertificates,
  approveSubsetForDispatch,
  getApproveAndDispatchEligibleCertificates,
} from "@/services/student.service";
import { queryKeys } from "./query-keys";

export function usePreviewBulkDispatch() {
  return useMutation({
    mutationFn: (ids: number[]) => previewBulkDispatchPdf(ids),
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useConfirmBulkDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ids: number[]; orderId?: number }) =>
      confirmBulkDispatch(vars.ids, vars.orderId),
    onSuccess: () => {
      // Match the keys invalidated by useBulkApproveCertificates so cert lists refresh.
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.dispatchEligible() });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.approveAndDispatchEligible() });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.franchiseeCerts() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

function useDispatchEligibleCertificates(
  params: { franchiseId?: string; programId?: number; levelId?: number; page?: number; limit?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.dispatchEligible(params as Record<string, unknown>),
    queryFn: () => getDispatchEligibleCertificates(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useApproveSubsetForDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => approveSubsetForDispatch(ids),
    onSuccess: () => {
      // Approval changes cert state -> invalidate every cert list.
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.dispatchEligible() });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.approveAndDispatchEligible() });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.franchiseeCerts() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useApproveAndDispatchEligibleCertificates(
  params: { franchiseId?: string; programId?: number; levelId?: number; page?: number; limit?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.approveAndDispatchEligible(params as Record<string, unknown>),
    queryFn: () => getApproveAndDispatchEligibleCertificates(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}
