"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { completeTraining } from "@/services/course-instructor.service";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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

      toast({
        title: "Training Completed",
        description: `Successfully completed training for ${instructorName}. Graduation recorded.`,
      });

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to complete training. The instructor may have already graduated from this level.",
        variant: "destructive",
      });
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Training
          </DialogTitle>
          <DialogDescription>
            Record graduation details for {instructorName} - {levelName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will mark the training as complete and record the graduation.
              The instructor cannot graduate from this level again.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="marksObtained">
              Marks Obtained (%) <span className="text-gray-500">(Optional)</span>
            </Label>
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
              placeholder="e.g., 95.5"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificateNumber">
              Certificate Number <span className="text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="certificateNumber"
              value={formData.certificateNumber}
              onChange={(e) =>
                setFormData({ ...formData, certificateNumber: e.target.value })
              }
              placeholder="e.g., CERT-2024-001"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes or comments..."
              rows={3}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Training"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

