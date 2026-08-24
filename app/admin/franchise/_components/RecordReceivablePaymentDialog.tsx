"use client";

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { FormDialog } from "@/components/shared/dialog/templates/FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/currency-utils";
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/constants/payments";

/** Minimal shape the dialog reads — receivable items and the lump-sum agreement fee both satisfy it. */
export interface RecordPaymentDialogItem {
  label: string;
  amount: number;
  payableAmount?: number;
}

interface RecordReceivablePaymentDialogProps {
  item: RecordPaymentDialogItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: {
    paidAt: string;
    mode: string;
    reference?: string;
  }) => void;
  isSubmitting: boolean;
}

export function RecordReceivablePaymentDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: RecordReceivablePaymentDialogProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [paidAt, setPaidAt] = useState<string>(today);
  const [mode, setMode] = useState<string>("cash");
  const [reference, setReference] = useState<string>("");

  // Reset form whenever the dialog opens with a new item.
  useEffect(() => {
    if (open) {
      setPaidAt(today);
      setMode("cash");
      setReference("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paidAt || !mode) return;
    onSubmit({
      paidAt,
      mode,
      reference: reference.trim() || undefined,
    });
  };

  const amountDisplay = item
    ? formatRupees(item.payableAmount ?? item.amount)
    : "";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description={
        item
          ? `Record an offline payment for ${item.label}.`
          : "Record an offline payment"
      }
      headerIcon={Banknote}
      submitLabel="Record Payment"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      canSubmit={!!paidAt && !!mode && !isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4">
        {/* Read-only amount display */}
        {item ? (
          <div className="rounded-md border bg-muted/50 p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold tabular-nums">{amountDisplay}</span>
          </div>
        ) : null}

        {/* Paid On */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="record-payment-paid-at">
            Paid on <span className="text-destructive">*</span>
          </Label>
          <Input
            id="record-payment-paid-at"
            type="date"
            value={paidAt}
            max={today}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>

        {/* Mode */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="record-payment-mode">
            Payment mode <span className="text-destructive">*</span>
          </Label>
          <select
            id="record-payment-mode"
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        {/* Reference (optional) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="record-payment-reference">
            Reference{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="record-payment-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. cheque number, UPI ref ID…"
          />
        </div>
      </div>
    </FormDialog>
  );
}
