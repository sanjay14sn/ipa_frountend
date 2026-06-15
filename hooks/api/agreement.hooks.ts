"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAgreementsAdmin,
  getAgreementsMine,
  getAgreementAdmin,
  getAgreementMine,
  waiveReceivableItem,
  updateReceivableItemDueDate,
  recordReceivablePayment,
  sendReceivableReminder,
  dispatchFranchiseKit,
  suspendAgreementAdmin,
  reactivateAgreementAdmin,
  voidAgreementAdmin,
  type AgreementRecord,
  type AgreementListParams,
} from "@/services/agreement.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";
import { extractErrorMessage } from "@/lib/error-utils";

function mineKey(
  franchiseId: string | undefined,
  extra?: Omit<AgreementListParams, "franchiseId">,
) {
  return queryKeys.agreements.mine({
    franchiseId: franchiseId ?? "",
    ...extra,
  } as Record<string, unknown>);
}

function adminKey(
  franchiseId?: string,
  extra?: Omit<AgreementListParams, "franchiseId">,
) {
  return queryKeys.agreements.admin({
    franchiseId: franchiseId ?? "",
    ...extra,
  } as Record<string, unknown>);
}

export function useAgreementsMine(
  franchiseId: string | undefined,
  listParams?: Omit<AgreementListParams, "franchiseId">,
) {
  return useQuery({
    queryKey: mineKey(franchiseId, listParams),
    queryFn: () =>
      getAgreementsMine({
        franchiseId,
        ...listParams,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAgreementsAdmin(
  franchiseId?: string,
  listParams?: Omit<AgreementListParams, "franchiseId">,
) {
  return useQuery({
    queryKey: adminKey(franchiseId, listParams),
    queryFn: () =>
      getAgreementsAdmin({
        franchiseId,
        ...listParams,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAgreementMine(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.agreements.detail(id ?? 0),
    queryFn: () => getAgreementMine(id!),
    enabled: id != null && id > 0,
  });
}

export function useAgreementAdmin(id: number | undefined) {
  return useQuery({
    queryKey: [...queryKeys.agreements.detail(id ?? 0), "admin"] as const,
    queryFn: () => getAgreementAdmin(id!),
    enabled: id != null && id > 0,
  });
}

async function invalidateAgreementLists() {
  const client = getQueryClientBridge();
  await client.invalidateQueries({ queryKey: ["agreements", "list"] });
}

/** Admin: one-time free franchise kit dispatch for a Valid NEW_FRANCHISE agreement. */
export function useDispatchFranchiseKitMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => dispatchFranchiseKit(agreementId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.agreements.detail(agreementId),
        }),
        client.invalidateQueries({ queryKey: ["agreements", "list"] }),
        client.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      toast.success("Franchise kit order created");
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, "Failed to dispatch franchise kit"),
      );
    },
  });
}

export function useWaiveReceivableItemMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, reason }: { itemId: number; reason: string }) =>
      waiveReceivableItem(itemId, reason),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: queryKeys.agreements.detail(agreementId),
      });
      toast.success("Receivable waived");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to waive receivable"));
    },
  });
}

export function useUpdateReceivableDueDateMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, dueAt }: { itemId: number; dueAt: string }) =>
      updateReceivableItemDueDate(itemId, dueAt),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: queryKeys.agreements.detail(agreementId),
      });
      toast.success("Due date updated");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update due date"));
    },
  });
}

export function useRecordReceivablePaymentMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      paidAt,
      mode,
      reference,
    }: {
      itemId: number;
      paidAt: string;
      mode: string;
      reference?: string;
    }) => recordReceivablePayment(itemId, { paidAt, mode, reference }),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: queryKeys.agreements.detail(agreementId),
      });
      toast.success("Payment recorded");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to record payment"));
    },
  });
}

export function useSendReceivableReminderMutation(agreementId: number) {
  return useMutation({
    mutationFn: ({ itemId }: { itemId: number }) =>
      sendReceivableReminder(itemId),
    onSuccess: () => {
      toast.success("Reminder sent");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to send reminder"));
    },
  });
}

/** Admin: suspend a Valid agreement (optional reason). */
export function useSuspendAgreementMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => suspendAgreementAdmin(agreementId, reason),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.agreements.detail(agreementId),
        }),
        client.invalidateQueries({ queryKey: ["agreements", "list"] }),
      ]);
      toast.success("Agreement suspended");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to suspend agreement"));
    },
  });
}

/** Admin: reactivate a Suspended agreement. */
export function useReactivateAgreementMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => reactivateAgreementAdmin(agreementId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.agreements.detail(agreementId),
        }),
        client.invalidateQueries({ queryKey: ["agreements", "list"] }),
      ]);
      toast.success("Agreement reactivated");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to reactivate agreement"));
    },
  });
}

/** Admin: void an agreement — terminal (optional reason). */
export function useVoidAgreementMutation(agreementId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => voidAgreementAdmin(agreementId, reason),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.agreements.detail(agreementId),
        }),
        client.invalidateQueries({ queryKey: ["agreements", "list"] }),
      ]);
      toast.success("Agreement voided");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to void agreement"));
    },
  });
}

