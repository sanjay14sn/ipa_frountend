"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { completeTraining } from "@/services/course-instructor.service";
import { toast } from "sonner";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  DialogFormField,
  DialogStateMessage,
  FormDialog,
} from "@/components/shared/dialog";

interface CompleteTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingId: number;
  instructorName: string;
  levelName: string;
  onSuccess?: () => void;
}

export function CompleteTrainingModal({
  isOpen,
  onClose,
  trainingId,
  instructorName,
  levelName,
  onSuccess,
}: CompleteTrainingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    marksObtained: "",
    certificateNumber: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data: any = {};
      if (formData.marksObtained) {
        data.marksObtained = parseFloat(formData.marksObtained);
      }
      if (formData.certificateNumber) {
        data.certificateNumber = formData.certificateNumber;
      }
      if (formData.notes) {
        data.notes = formData.notes;
      }

      await completeTraining(trainingId, data);

      toast.success(
        `Successfully completed training for ${instructorName}. Graduation recorded.`
      );

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      toast.error(
        err.message ||
          "Failed to complete training. The instructor may have already graduated from this level."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      marksObtained: "",
      certificateNumber: "",
      notes: "",
    });
    onClose();
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(o) => (o ? null : handleClose())}
      size="md"
      title="Complete Training"
      description={`Record graduation details for ${instructorName} — ${levelName}`}
      headerIcon={CheckCircle2}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel="Complete Training"
    >
      <DialogStateMessage
        tone="info"
        icon={AlertCircle}
        title="This will mark the training as complete and record the graduation."
        description="The instructor cannot graduate from this level again."
      />

      <DialogFormField
        id="marksObtained"
        label={
          <span>
            Marks Obtained (%){" "}
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        }
      >
        <Input
          id="marksObtained"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={formData.marksObtained}
          onChange={(e) =>
            setFormData({ ...formData, marksObtained: e.target.value })
          }
          onFocus={selectInputValueOnFocus}
          placeholder="e.g., 95.5"
          disabled={loading}
        />
      </DialogFormField>

      <DialogFormField
        id="certificateNumber"
        label={
          <span>
            Certificate Number{" "}
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        }
      >
        <Input
          id="certificateNumber"
          value={formData.certificateNumber}
          onChange={(e) =>
            setFormData({ ...formData, certificateNumber: e.target.value })
          }
          placeholder="e.g., CERT-2024-001"
          disabled={loading}
        />
      </DialogFormField>

      <DialogFormField
        id="notes"
        label={
          <span>
            Notes{" "}
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        }
      >
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes or comments..."
          rows={3}
          disabled={loading}
        />
      </DialogFormField>
    </FormDialog>
  );
}
