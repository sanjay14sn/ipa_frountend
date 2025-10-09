"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { CITrainingData } from "@/services/course-instructor.service";

interface CompleteTrainingConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: CITrainingData | null;
  onConfirm: () => void;
  isCompleting?: boolean;
}

export default function CompleteTrainingConfirmation({
  open,
  onOpenChange,
  instructor,
  onConfirm,
  isCompleting = false,
}: CompleteTrainingConfirmationProps) {
  if (!instructor) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                Training Type:
              </span>
              <span className="text-sm text-gray-900">
                {instructor.trainingType}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Amount:</span>
              <span className="text-sm font-gray-900 font-medium">
                {formatCurrency(instructor.amount)}
              </span>
            </div>
            {instructor.installmentCount && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  EMI Plan:
                </span>
                <span className="text-sm text-gray-900">
                  {instructor.installmentCount} months
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCompleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
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
