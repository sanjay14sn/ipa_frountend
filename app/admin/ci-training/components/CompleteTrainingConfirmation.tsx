"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  CITrainingData,
  CompleteTrainingRequest,
} from "@/services/course-instructor.service";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  DialogFormField,
  DialogStateMessage,
  FormDialog,
} from "@/components/shared/dialog";

interface CompleteTrainingConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: CITrainingData | null;
  onConfirm: (data: CompleteTrainingRequest) => void | Promise<void>;
  isCompleting?: boolean;
}

export default function CompleteTrainingConfirmation({
  open,
  onOpenChange,
  instructor,
  onConfirm,
  isCompleting = false,
}: CompleteTrainingConfirmationProps) {
  const [marksObtained, setMarksObtained] = useState("");

  if (!instructor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: CompleteTrainingRequest = {};
    if (marksObtained.trim()) {
      const parsed = parseFloat(marksObtained);
      if (!isNaN(parsed)) data.marksObtained = parsed;
    }
    await onConfirm(data);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setMarksObtained("");
    onOpenChange(open);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDurationTillDate = () => {
    const startStr = instructor.dateOfTraining || instructor.createdAt;
    if (!startStr) return "N/A";
    const start = new Date(startStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Less than 1 day";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      title="Complete Training?"
      description="Are you sure you want to mark this training as completed? This action cannot be undone."
      headerIcon={AlertTriangle}
      onSubmit={handleSubmit}
      isSubmitting={isCompleting}
      submitLabel="Complete Training"
    >
      <DialogStateMessage tone="warning" icon={AlertTriangle} title="This action cannot be undone." />

      <div className="bg-muted/40 rounded-lg p-4 space-y-2 border border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Instructor:
          </span>
          <span className="text-sm text-card-foreground">
            {instructor.instructorName}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">ID:</span>
          <span className="text-sm text-card-foreground">
            {instructor.instructorId}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Training Level:
          </span>
          <span className="text-sm text-card-foreground">
            {instructor.trainingLevelName || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Training Start Date:
          </span>
          <span className="text-sm text-card-foreground">
            {formatDate(instructor.createdAt)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Training Duration:
          </span>
          <span className="text-sm text-card-foreground">
            {getDurationTillDate()}
          </span>
        </div>
      </div>

      <DialogFormField id="marksObtained" label="Marks Obtained (%)">
        <Input
          id="marksObtained"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="e.g., 95.5"
          value={marksObtained}
          onChange={(e) => setMarksObtained(e.target.value)}
          onFocus={selectInputValueOnFocus}
          disabled={isCompleting}
        />
      </DialogFormField>
    </FormDialog>
  );
}
