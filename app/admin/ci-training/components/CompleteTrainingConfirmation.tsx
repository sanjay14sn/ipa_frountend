"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
  CITrainingData,
  CompleteTrainingRequest,
} from "@/services/course-instructor.service";

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

  const handleConfirm = () => {
    const data: CompleteTrainingRequest = {};
    if (marksObtained.trim()) {
      const parsed = parseFloat(marksObtained);
      if (!isNaN(parsed)) data.marksObtained = parsed;
    }
    onConfirm(data);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full mx-4">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Complete Training?
          </DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to mark this training as completed? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Instructor:
              </span>
              <span className="text-sm text-gray-900">
                {instructor.instructorName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">ID:</span>
              <span className="text-sm text-gray-900">
                {instructor.instructorId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Training Level:
              </span>
              <span className="text-sm text-gray-900">
                {instructor.trainingLevelName || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Training Start Date:
              </span>
              <span className="text-sm text-gray-900">
                {formatDate(instructor.createdAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Training Duration:
              </span>
              <span className="text-sm text-gray-900">
                {getDurationTillDate()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="marksObtained">Marks Obtained (%)</Label>
          <Input
            id="marksObtained"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g., 95.5"
            value={marksObtained}
            onChange={(e) => setMarksObtained(e.target.value)}
            disabled={isCompleting}
          />
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCompleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCompleting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isCompleting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Completing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Complete Training</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
