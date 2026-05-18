"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  User,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CITrainingData } from "@/services/course-instructor.service";
import { completeTrainingWithRevalidation } from "@/hooks/api/course-instructor.hooks";

interface TrainingPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: CITrainingData;
  onSuccess: () => void;
}

export default function TrainingPreviewModal({
  open,
  onOpenChange,
  instructor,
  onSuccess,
}: TrainingPreviewModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleCompleteTraining = async () => {
    try {
      setIsApproving(true);
      await completeTrainingWithRevalidation(instructor.id);
      setApproved(true);
      onSuccess();
    } catch (error) {
      console.error("Error completing training:", error);
      toast.error("Failed to complete training. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleClose = () => {
    setApproved(false);
    setIsApproving(false);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrainingTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "elementary":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "regular":
        return "bg-green-50 text-green-700 border-green-200";
      case "grand":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (approved) {
    return (
      <Dialog open={false} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Training Completed!
            </DialogTitle>
            <DialogDescription className="text-center">
              The training for {instructor.instructorName} has been marked as
              completed.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full mx-4">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Training Status Update
          </DialogTitle>
          <DialogDescription>
            Review and update the training completion status
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Training Details Card */}
          <div className="w-full max-w-md bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-lg p-6 text-white">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="text-center border-b border-white/20 pb-3 mb-4">
                <h3 className="font-bold text-lg">ABACUS ACADEMY</h3>
                <p className="text-xs opacity-90">COURSE INSTRUCTOR TRAINING</p>
              </div>

              {/* Instructor Info */}
              <div className="flex-1 flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-semibold text-lg">
                    {instructor.instructorName}
                  </h4>
                  <p className="text-sm opacity-90">
                    ID: {instructor.instructorId}
                  </p>
                  <p className="text-xs opacity-80">
                    Training: {instructor.trainingLevelName || "N/A"}
                  </p>
                </div>
              </div>

              {/* Training Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(instructor.amount ?? 0)}
                  </span>
                </div>
                {instructor.installmentCount && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-80">EMI Plan:</span>
                    <span className="font-semibold">
                      {instructor.installmentCount} months
                    </span>
                  </div>
                )}
                {instructor.installmentAmount && (
                  <div className="flex justify-between items-center">
                    <span className="opacity-80">Monthly:</span>
                    <span className="font-semibold">
                      {formatCurrency(instructor.installmentAmount ?? 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center border-t border-white/20 pt-3 mt-4">
                <p className="text-xs opacity-80">
                  Training Status: In Progress
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {instructor.additionalDetails && (
            <div className="w-full bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Additional Details
              </h4>
              <p className="text-sm text-gray-700">
                {instructor.additionalDetails}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isApproving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteTraining}
              disabled={isApproving}
              className="flex-1"
            >
              {isApproving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
