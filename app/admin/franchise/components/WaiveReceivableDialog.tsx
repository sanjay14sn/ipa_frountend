"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Slash } from "lucide-react";
import { FormDialog } from "@/components/shared/dialog/templates/FormDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupees } from "@/lib/currency-utils";
import type { ReceivableSummaryItem } from "@/services/agreement.service";

const schema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});
type FormValues = z.infer<typeof schema>;

interface WaiveReceivableDialogProps {
  item: ReceivableSummaryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (itemId: number, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function WaiveReceivableDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: WaiveReceivableDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!item) return;
    await onSubmit(item.receivableItemId, values.reason);
    form.reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Waive receivable"
      description={
        item
          ? `Waiving ${item.label} (${formatRupees(item.payableAmount ?? item.amount)}) cannot be undone.`
          : "Waive this receivable item"
      }
      headerIcon={Slash}
      submitLabel="Waive item"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      canSubmit={form.formState.isValid}
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="waive-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="waive-reason"
          placeholder="Describe why this receivable is being waived…"
          rows={3}
          {...form.register("reason")}
        />
        {form.formState.errors.reason && (
          <p className="text-xs text-destructive">
            {form.formState.errors.reason.message}
          </p>
        )}
      </div>
    </FormDialog>
  );
}
