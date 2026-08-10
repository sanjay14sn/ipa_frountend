"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
  AppDialogFooter,
} from "@/components/shared/dialog";
import {
  AgreementTermsFields,
  agreementTermsFieldsFromRecord,
  validateAgreementTermsFields,
  type AgreementTermsFieldsValue,
} from "./agreement-terms-fields";
import {
  renewAgreementAdmin,
  type AgreementRecord,
  type RenewAgreementInput,
  type UnpaidItemsPolicy,
} from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";
import { formatDate } from "@/lib/date-utils";

interface IssueRenewalButtonProps {
  agreement: AgreementRecord;
}

export interface IssueRenewalDialogProps {
  agreement: AgreementRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Controlled renewal-terms dialog — used by IssueRenewalButton and by the
 * agreements-table row overflow menu (which supplies its own trigger).
 * Serves FRANCHISE and PROGRAM kinds (one renew endpoint for both).
 *
 * Every term of the expired agreement is prefilled and editable — the shared
 * AgreementTermsFields owns the inputs, so the terms live in plain state
 * (the sanctioned zod-less shape for forms whose blob a child component owns).
 */
export function IssueRenewalDialog({
  agreement,
  open,
  onOpenChange,
}: IssueRenewalDialogProps) {
  const queryClient = useQueryClient();
  const [terms, setTerms] = useState<AgreementTermsFieldsValue>(() =>
    agreementTermsFieldsFromRecord(agreement),
  );
  const [unpaidItemsPolicy, setUnpaidItemsPolicy] =
    useState<UnpaidItemsPolicy>("carry");
  const [cancelReason, setCancelReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Renewing an agreement that is still running schedules it: the backend parks
   * the renewal in DRAFT and promotes it the day this one expires. Renewing an
   * already-EXPIRED agreement issues it straight away.
   */
  const scheduled =
    agreement.status === "ACTIVE" || agreement.status === "SUSPENDED";
  const expiresOn = agreement.expiresAt ? formatDate(agreement.expiresAt) : null;

  const mutation = useMutation({
    mutationFn: () => {
      const dto: RenewAgreementInput = {
        franchiseFee: terms.franchiseFee,
        monthlyFee: terms.monthlyFee,
        royalty: terms.royalty,
        materialCost: terms.materialCost,
        kitCost: terms.kitCost,
        ciShare: terms.ciShare,
        franchiseShare: terms.franchiseShare,
        gstFranchiseFee: terms.gstFranchiseFee,
        gstRoyalty: terms.gstRoyalty,
        gstMaterialCost: terms.gstMaterialCost,
        installment: terms.installment,
        // Required when installment=true; axios drops the undefineds.
        installmentMonths: terms.installment
          ? terms.installmentMonths
          : undefined,
        downPayment: terms.installment ? terms.downPayment : undefined,
        tenure: terms.tenure,
        unpaidItemsPolicy,
        cancelReason:
          unpaidItemsPolicy === "cancel" ? cancelReason.trim() : undefined,
      };
      return renewAgreementAdmin(agreement.id, dto);
    },
    onSuccess: async () => {
      toast.success(
        scheduled
          ? "Renewal scheduled — it is issued to the franchisee automatically when this agreement expires."
          : "Renewal issued — the franchisee can now sign and pay.",
      );
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["agreements", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["agreements"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Could not issue renewal")),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The renewal is born APPROVED (payable), so the fee must be real.
    const message =
      validateAgreementTermsFields(terms, { requirePositiveFee: true }) ??
      (unpaidItemsPolicy === "cancel" && cancelReason.trim().length === 0
        ? "Give a reason for cancelling the unpaid items"
        : null);
    setFormError(message);
    if (message) return;
    mutation.mutate();
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="lg" scrollBody>
      <AppDialogHeader
        title={scheduled ? "Schedule renewal" : "Issue renewal"}
        description={
          scheduled
            ? `Adjust the renewal terms now — they are prefilled from the current agreement. The renewal is held until this agreement expires${expiresOn ? ` on ${expiresOn}` : ""}, then issued to the franchisee automatically to sign and pay — so there is no gap in access.`
            : "Adjust the renewal terms — they are prefilled from the expired agreement. The franchisee will sign and pay to reactivate."
        }
      />
      <AppDialogBody>
        <form
          id="issue-renewal-form"
          className="space-y-4"
          onSubmit={submit}
        >
          <AgreementTermsFields
            idPrefix="renewal"
            value={terms}
            onChange={(patch) => setTerms((prev) => ({ ...prev, ...patch }))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="renewal-unpaid-policy">Unpaid items on the old plan</Label>
            <Select
              value={unpaidItemsPolicy}
              onValueChange={(v) => setUnpaidItemsPolicy(v as UnpaidItemsPolicy)}
            >
              <SelectTrigger id="renewal-unpaid-policy" className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carry">Carry onto the renewal plan</SelectItem>
                <SelectItem value="cancel">Cancel them (with reason)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {unpaidItemsPolicy === "cancel" ? (
            <div className="space-y-1.5">
              <Label htmlFor="renewal-cancel-reason">Cancellation reason</Label>
              <Input
                id="renewal-cancel-reason"
                placeholder="Why are the unpaid items being cancelled?"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </div>
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
        </form>
      </AppDialogBody>
      <AppDialogFooter
        secondary={{ label: "Cancel", onClick: () => onOpenChange(false) }}
        primary={{
          label: scheduled ? "Schedule" : "Issue",
          form: "issue-renewal-form",
          type: "submit",
          loading: mutation.isPending,
        }}
      />
    </AppDialog>
  );
}

export function IssueRenewalButton({ agreement }: IssueRenewalButtonProps) {
  const [open, setOpen] = useState(false);

  // Live agreements are renewable too — that renewal is scheduled rather than
  // issued immediately. Gating on EXPIRED alone meant an admin could not
  // prepare a renewal for an agreement they knew lapsed tomorrow.
  const scheduled =
    agreement.status === "ACTIVE" || agreement.status === "SUSPENDED";
  if (agreement.status !== "EXPIRED" && !scheduled) return null;

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {scheduled ? "Schedule renewal" : "Issue renewal"}
      </Button>
      <IssueRenewalDialog agreement={agreement} open={open} onOpenChange={setOpen} />
    </>
  );
}
