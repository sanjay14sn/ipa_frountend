"use client";

import { useEffect, useState } from "react";
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
  const [phase, setPhase] = useState<1 | 2>(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setPhase(1);
    }
  }, [open, form]);

  const handleNext = form.handleSubmit(() => {
    setPhase(2);
  });

  const handleConfirm = async () => {
    if (!item) return;
    const values = form.getValues();
    await onSubmit(item.receivableItemId, values.reason);
    form.reset();
    onOpenChange(false);
  };

  const amountDisplay = item
    ? formatRupees(item.payableAmount ?? item.amount)
    : "";

  if (phase === 1) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Waive receivable"
        description={
          item
            ? `Waiving ${item.label} (${amountDisplay}) cannot be undone.`
            : "Waive this receivable item"
        }
        headerIcon={Slash}
        submitLabel="Next"
        cancelLabel="Cancel"
        isSubmitting={false}
        canSubmit={form.formState.isValid}
        onSubmit={handleNext}
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

  // Phase 2: confirmation screen
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm waive"
      description="Please review the details before confirming."
      headerIcon={Slash}
      submitLabel="Confirm Waive"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      canSubmit={!isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirm();
      }}
      extraAction={{
        label: "Back",
        onClick: () => setPhase(1),
        type: "button",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-md border bg-muted/50 p-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium">{item?.label ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{amountDisplay}</span>
          </div>
        </div>
        <p className="text-sm text-destructive font-medium">
          This cannot be undone.
        </p>
      </div>
    </FormDialog>
  );
}
