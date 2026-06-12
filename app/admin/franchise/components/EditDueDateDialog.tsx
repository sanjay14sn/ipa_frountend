"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { FormDialog } from "@/components/shared/dialog/templates/FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ReceivableSummaryItem } from "@/services/agreement.service";

interface EditDueDateDialogProps {
  item: ReceivableSummaryItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (dueAt: string) => void;
  isSubmitting: boolean;
}

export function EditDueDateDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditDueDateDialogProps) {
  // Normalise the stored ISO datetime to a plain date string ("YYYY-MM-DD")
  // so it can be used as a date input's value.
  const toDateValue = (iso: string | null | undefined): string => {
    if (!iso) return "";
    // Slice to "YYYY-MM-DD" — handles both date-only and datetime ISO strings.
    return iso.slice(0, 10);
  };

  const [dateValue, setDateValue] = useState<string>(() =>
    toDateValue(item?.dueAt),
  );

  // Sync the local state whenever the dialog opens with a new item.
  useEffect(() => {
    if (open) {
      setDateValue(toDateValue(item?.dueAt));
    }
  }, [open, item]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dateValue) return;
    // Convert "YYYY-MM-DD" to a full ISO string (midnight UTC).
    onSubmit(new Date(dateValue).toISOString());
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Due Date"
      description={
        item ? `Update the due date for ${item.label}.` : "Update due date"
      }
      headerIcon={CalendarDays}
      submitLabel="Save"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      canSubmit={!!dateValue && !isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-due-date">
          New due date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-due-date"
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />
        {item?.label ? (
          <p className="text-xs text-muted-foreground">
            Item: <span className="font-medium">{item.label}</span>
          </p>
        ) : null}
      </div>
    </FormDialog>
  );
}
