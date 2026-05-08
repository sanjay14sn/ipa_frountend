"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import { getActiveTrainingLevels, TrainingLevel } from "@/services/training-level.service";
import { MultiLevelTrainingPaymentModal } from "./MultiLevelTrainingPaymentModal";
import { RequestTrainingModal } from "./RequestTrainingModal";
import { RequestMaterialsModal } from "./RequestMaterialsModal";

interface TrainingProgressViewProps {
  instructorId: number;
  instructorName: string;
  onPaymentSuccess?: () => void;
}

export function TrainingProgressView({
  instructorId,
  instructorName,
  onPaymentSuccess,
}: TrainingProgressViewProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [requestTrainingModalOpen, setRequestTrainingModalOpen] = useState(false);
  const [requestMaterialsModalOpen, setRequestMaterialsModalOpen] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [instructorId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const [progressData, levels] = await Promise.all([
        getCITrainingProgress(instructorId),
        getActiveTrainingLevels().catch(() => []),
      ]);
      setProgress(progressData);
      setTrainingLevels(levels);
    } catch (err: any) {
      setError(err.message || "Failed to load training progress");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    loadProgress();
    onPaymentSuccess?.();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="py-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activeTrainingLevelId = progress?.activeTraining?.trainingLevelId;
  const availableLevels = trainingLevels.filter((l) => l.id !== activeTrainingLevelId);
  const unpaidTrainings = progress?.trainings?.filter((t) => !t.paid && !t.isCompleted) || [];

  if (!progress || !progress.trainings || progress.trainings.length === 0) {
    return (
      <>
        <Alert className="py-2">
          <AlertDescription className="text-xs">
            No training levels registered.
          </AlertDescription>
        </Alert>

        <RequestTrainingModal
          isOpen={requestTrainingModalOpen}
          onClose={() => setRequestTrainingModalOpen(false)}
          instructorId={instructorId}
          instructorName={instructorName}
          onSuccess={() => { loadProgress(); onPaymentSuccess?.(); }}
        />
      </>
    );
  }

  return (
    <>
      {/* Progress bar */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.completedTrainings ?? 0} of {progress.totalTrainings ?? 0} completed</span>
          <span>{(progress.progress ?? 0).toFixed(0)}%</span>
        </div>
        <Progress value={progress.progress ?? 0} className="h-1.5" />
      </div>

      {/* Levels list — compact, no individual cards */}
      <div className="divide-y divide-border">
        {(progress.trainings ?? []).map((training) => (
          <div
            key={training.id ?? training.trainingLevelId}
            className="flex items-center justify-between py-1.5 gap-3"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs text-muted-foreground w-4 shrink-0">
                {training.displayOrder}
              </span>
              <span className="text-sm text-card-foreground truncate">
                {training.trainingLevelName}
              </span>
              {training.isCompleted && training.marks != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {training.marks}%
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {training.paid ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0">
                  Paid
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs px-1.5 py-0">
                  Unpaid
                </Badge>
              )}
              {training.isCompleted && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0">
                  Completed
                </Badge>
              )}
              {training.isActive && !training.isCompleted && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <MultiLevelTrainingPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <RequestTrainingModal
        isOpen={requestTrainingModalOpen}
        onClose={() => setRequestTrainingModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onSuccess={() => { loadProgress(); onPaymentSuccess?.(); }}
      />
      <RequestMaterialsModal
        isOpen={requestMaterialsModalOpen}
        onClose={() => setRequestMaterialsModalOpen(false)}
        instructorId={instructorId}
        instructorName={instructorName}
        onSuccess={() => { loadProgress(); onPaymentSuccess?.(); }}
      />
    </>
  );
}
