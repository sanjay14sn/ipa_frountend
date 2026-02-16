"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  AlertCircle,
  Target,
} from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";

interface TrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
}

export function TrainingProgressModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
}: TrainingProgressModalProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProgress();
    }
  }, [isOpen, instructorId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCITrainingProgress(instructorId);
      setProgress(data);
    } catch (err: any) {
      setError(err.message || "Failed to load training progress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Training Progress - {instructorName}
          </DialogTitle>
          <DialogDescription>
            Track sequential training completion and progress
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !progress || progress.totalTrainings === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              No training levels enrolled yet for this instructor.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {progress.completedTrainings} of {progress.totalTrainings} completed
                </span>
                <span className="font-medium text-gray-900">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>

            {/* Active Training */}
            {progress.activeTraining && (
              <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Active:</span>{" "}
                  {progress.activeTraining.trainingLevelName}
                </p>
              </div>
            )}

            {/* Training List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Training Levels</h3>
              {progress.trainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-medium text-gray-500 w-6">
                      {training.displayOrder}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {training.trainingLevelName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        ₹{training.amount.toLocaleString()}
                        {training.isCompleted && training.marks != null && (
                          <span className="ml-2 font-medium text-gray-700">
                            • Marks: {training.marks}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {training.paid ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                        Unpaid
                      </Badge>
                    )}
                    {training.isCompleted && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Completed
                      </Badge>
                    )}
                    {training.isActive && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {progress.completedTrainings === progress.totalTrainings && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  All trainings completed
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


