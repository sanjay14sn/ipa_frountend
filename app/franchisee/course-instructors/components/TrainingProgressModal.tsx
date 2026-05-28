"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, GraduationCap } from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import {
  DetailDialog,
  DialogProgressCard,
} from "@/components/shared/dialog";

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
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getCITrainingProgress(instructorId)
      .then((prog) => setProgress(prog))
      .catch((err: any) =>
        setError(err.message || "Failed to load training progress"),
      )
      .finally(() => setLoading(false));
  }, [isOpen, instructorId]);

  const trainings = progress?.trainings ?? [];

  return (
    <DetailDialog
      open={isOpen}
      onOpenChange={onClose}
      size="lg"
      title={`Training Progress — ${instructorName}`}
      description="Sequential training levels and completion status"
      headerIcon={GraduationCap}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !progress || (progress.totalTrainings ?? 0) === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No training levels enrolled yet.
        </div>
      ) : (
        <div className="space-y-4">
          <DialogProgressCard
            title={`${progress.completedTrainings ?? 0} of ${
              progress.totalTrainings ?? 0
            } completed`}
            value={progress.progress ?? 0}
          />

          <div className="divide-y divide-border rounded-lg border">
            {trainings.map((training) => (
              <div
                key={training.id ?? training.trainingLevelId}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-4 shrink-0 text-xs text-muted-foreground">
                  {training.displayOrder}
                </span>
                <span className="flex-1 text-sm text-card-foreground truncate">
                  {training.trainingLevelName}
                </span>
                {training.isCompleted && training.marks != null && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {training.marks}%
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {training.paid ? (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0"
                    >
                      Paid
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border text-xs px-1.5 py-0"
                    >
                      Unpaid
                    </Badge>
                  )}
                  {training.isCompleted && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0"
                    >
                      Completed
                    </Badge>
                  )}
                  {training.isActive && !training.isCompleted && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0"
                    >
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DetailDialog>
  );
}
