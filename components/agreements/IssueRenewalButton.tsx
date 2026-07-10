"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
  AppDialogFooter,
} from "@/components/shared/dialog";
import {
  renewProgramAgreementAdmin,
  type AgreementRecord,
  type RenewProgramAgreementInput,
} from "@/services/agreement.service";
import { getErrorMessage } from "@/lib/error-utils";

const schema = z.object({
  franchiseFee: z.coerce.number().min(0),
  tenure: z.coerce.number().int().min(1),
});
type FormValues = z.infer<typeof schema>;

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
 */
export function IssueRenewalDialog({
  agreement,
  open,
  onOpenChange,
}: IssueRenewalDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      franchiseFee: agreement.franchiseFee ?? 0,
      tenure: agreement.tenure ?? 12,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const dto: RenewProgramAgreementInput = {
        franchiseFee: values.franchiseFee,
        tenure: values.tenure,
        monthlyFee: agreement.monthlyFee ?? 0,
        royalty: agreement.royalty ?? 0,
        materialCost: agreement.materialCost ?? 0,
        kitCost: agreement.kitCost ?? 0,
        ciShare: agreement.ciShare ?? 0,
        franchiseShare: agreement.franchiseShare ?? 0,
        gstFranchiseFee: agreement.gstFranchiseFee ?? false,
        gstRoyalty: agreement.gstRoyalty ?? false,
        gstMaterialCost: agreement.gstMaterialCost ?? false,
        installment: agreement.installment ?? false,
      };
      return renewProgramAgreementAdmin(agreement.id, dto);
    },
    onSuccess: async () => {
      toast.success("Renewal issued — the franchisee can now sign and pay.");
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["agreements", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["agreements"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Could not issue renewal")),
  });

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogHeader
        title="Issue program renewal"
        description="Set the renewal terms. The franchisee will sign and pay to reactivate the program."
      />
      <AppDialogBody>
        <form
          id="issue-renewal-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="renewal-fee">Renewal fee</Label>
            <Input id="renewal-fee" type="number" step="1" {...form.register("franchiseFee")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renewal-tenure">Tenure (months)</Label>
            <Input id="renewal-tenure" type="number" step="1" {...form.register("tenure")} />
          </div>
        </form>
      </AppDialogBody>
      <AppDialogFooter
        secondary={{ label: "Cancel", onClick: () => onOpenChange(false) }}
        primary={{
          label: "Issue",
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

  if (agreement.status !== "Expired") return null;

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Issue renewal
      </Button>
      <IssueRenewalDialog agreement={agreement} open={open} onOpenChange={setOpen} />
    </>
  );
}
