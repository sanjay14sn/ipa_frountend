"use client";

import React, { useState, useCallback, useEffect } from "react";
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
import { Loader2, AlertCircle, GraduationCap } from "lucide-react";
import {
  getAdminCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface AdminTrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  programId: number;
}

export function AdminTrainingProgressModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
}: AdminTrainingProgressModalProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProgress(await getAdminCITrainingProgress(instructorId));
    } catch (err) {
      setError(getUserFriendlyMessage(err, "Failed to load training progress"));
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    if (!isOpen) return;
    void loadProgress();
  }, [isOpen, loadProgress]);

  const trainings = progress?.trainings ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Training Progress — {instructorName}
          </DialogTitle>
          <DialogDescription>
            Sequential training levels and completion status
          </DialogDescription>
        </DialogHeader>

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
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progress.completedTrainings ?? 0} of {progress.totalTrainings ?? 0} completed
                </span>
                <span>{Math.round(progress.progress ?? 0)}%</span>
              </div>
              <Progress value={progress.progress ?? 0} className="h-1.5" />
            </div>

            <div className="divide-y divide-border rounded-lg border">
              {trainings.map((training) => (
                <div
                  key={training.id ?? training.trainingLevelId}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
