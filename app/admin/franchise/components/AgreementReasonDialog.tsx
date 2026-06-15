"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import { FormDialog } from "@/components/shared/dialog/templates/FormDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AgreementReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  headerIcon?: LucideIcon;
  /** When true, a non-empty reason (≥3 chars) is required before submitting. */
  reasonRequired?: boolean;
  isSubmitting?: boolean;
  /** Receives the trimmed reason, or undefined when left blank. */
  onSubmit: (reason: string | undefined) => Promise<void> | void;
}

/**
 * Lightweight single-field dialog used for the optional-reason lifecycle
 * actions (Suspend / Void). Mirrors the FormDialog usage in
 * WaiveReceivableDialog so the look-and-feel stays consistent.
 */
export function AgreementReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  headerIcon,
  reasonRequired = false,
  isSubmitting,
  onSubmit,
}: AgreementReasonDialogProps) {
  const form = useForm<{ reason: string }>({ defaultValues: { reason: "" } });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const reason = values.reason.trim();
    if (reasonRequired && reason.length < 3) {
      form.setError("reason", {
        message: "Reason must be at least 3 characters",
      });
      return;
    }
    await onSubmit(reason ? reason : undefined);
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      headerIcon={headerIcon}
      submitLabel={submitLabel}
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      canSubmit={!isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="agreement-reason">
          Reason{" "}
          {reasonRequired ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-muted-foreground">(optional)</span>
          )}
        </Label>
        <Textarea
          id="agreement-reason"
          placeholder="Add a note for the audit trail…"
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
