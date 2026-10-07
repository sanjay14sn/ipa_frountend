"use client";

import { useEffect, useId, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dueDateToPaidAtIso,
  formatFeeHistoryRowTitle,
  isRegistrationFeeRow,
} from "@/lib/student-fee-history-display";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  updateStudentFeeInstallment,
  type StudentFeeHistoryRow,
} from "@/services/student-fee.service";

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export interface EditFeeInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: number;
  row: StudentFeeHistoryRow | null;
  allRows: StudentFeeHistoryRow[];
  onSaved: () => void | Promise<void>;
}

export function EditFeeInstallmentDialog({
  open,
  onOpenChange,
  studentId,
  row,
  allRows,
  onSaved,
}: EditFeeInstallmentDialogProps) {
  const formId = useId();
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidOnDate, setPaidOnDate] = useState("");
  const [isPaid, setIsPaid] = useState<"yes" | "no">("yes");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setAmount(String(row.amount));
    setDueDate(toDateInputValue(row.dueDate));
    setPaidOnDate(toDateInputValue(row.paidAt ?? row.dueDate));
    setIsPaid(row.status === "PAID" ? "yes" : "no");
  }, [open, row]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!row) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required.");
      return;
    }
    const markPaid = isPaid === "yes";
    if (markPaid && !paidOnDate) {
      toast.error("Paid on date is required when marked as paid.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateStudentFeeInstallment(studentId, row.sequence, {
        amount: parsedAmount,
        dueDate,
        paidAt: markPaid ? dueDateToPaidAtIso(paidOnDate) : null,
      });
      toast.success("Installment updated.");
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't update installment."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        row
          ? isRegistrationFeeRow(row)
            ? "Edit registration fee"
            : `Edit ${formatFeeHistoryRowTitle(row, allRows)}`
          : "Edit fee item"
      }
      description={
        row
          ? isRegistrationFeeRow(row)
            ? "Update registration amount, due date, and payment status."
            : "Update installment amount, due date, and whether this month is paid."
          : undefined
      }
      headerIcon={Pencil}
      formId={formId}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save changes"
      canSubmit={Boolean(row) && !isSubmitting}
    >
      <DialogFormField label="Amount" htmlFor={`${formId}-amount`} required>
        <Input
          id={`${formId}-amount`}
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </DialogFormField>
      <DialogFormField label="Due date" htmlFor={`${formId}-due`} required>
        <Input
          id={`${formId}-due`}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </DialogFormField>
      <DialogFormField label="Paid" htmlFor={`${formId}-paid-flag`} required>
        <Select
          value={isPaid}
          onValueChange={(value) => setIsPaid(value as "yes" | "no")}
        >
          <SelectTrigger id={`${formId}-paid-flag`}>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </DialogFormField>
      {isPaid === "yes" ? (
        <DialogFormField label="Paid on" htmlFor={`${formId}-paid`} required>
          <Input
            id={`${formId}-paid`}
            type="date"
            value={paidOnDate}
            onChange={(e) => setPaidOnDate(e.target.value)}
          />
        </DialogFormField>
      ) : (
        <p className="text-xs text-muted-foreground">
          Saving as not paid removes the payment record for this installment and
          updates the student&apos;s next due if this is the earliest unpaid
          installment.
        </p>
      )}
    </FormDialog>
  );
}
