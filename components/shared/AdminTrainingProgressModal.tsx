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
import { Loader2, AlertCircle, Package } from "lucide-react";
import {
  getAdminCITrainingProgress,
  getAdminCITrainingPackages,
  CITrainingProgress,
  CITrainingPackage,
} from "@/services/course-instructor.service";

interface AdminTrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
}

export function AdminTrainingProgressModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
}: AdminTrainingProgressModalProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [packages, setPackages] = useState<CITrainingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      Promise.all([
        getAdminCITrainingProgress(instructorId),
        getAdminCITrainingPackages(instructorId),
      ])
        .then(([prog, pkgs]) => {
          setProgress(prog);
          setPackages(pkgs.sort((a, b) => a.packageOrder - b.packageOrder));
        })
        .catch((err: any) => setError(err.message || "Failed to load training progress"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, instructorId]);

  const trainings = progress?.trainings ?? [];

  const packageGroups: Array<{ pkg: CITrainingPackage | null; levels: typeof trainings }> = [];

  if (packages.length > 0) {
    for (const pkg of packages) {
      const levels = trainings.filter((t) =>
        pkg.trainingLevelIds.includes(t.trainingLevelId),
      );
      if (levels.length > 0) packageGroups.push({ pkg, levels });
    }
    const assignedIds = new Set(packages.flatMap((p) => p.trainingLevelIds));
    const unassigned = trainings.filter((t) => !assignedIds.has(t.trainingLevelId));
    if (unassigned.length > 0) packageGroups.push({ pkg: null, levels: unassigned });
  } else if (trainings.length > 0) {
    packageGroups.push({ pkg: null, levels: trainings });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Training Progress — {instructorName}
          </DialogTitle>
          <DialogDescription>Sequential training levels and completion status</DialogDescription>
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
                <span>{progress.completedTrainings ?? 0} of {progress.totalTrainings ?? 0} completed</span>
                <span>{Math.round(progress.progress ?? 0)}%</span>
              </div>
              <Progress value={progress.progress ?? 0} className="h-1.5" />
            </div>

            <div className="space-y-4">
              {packageGroups.map(({ pkg, levels }, idx) => (
                <div
                  key={pkg?.id ?? `unassigned-${idx}`}
                  className="rounded-lg border border-border bg-muted/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Package className="h-3.5 w-3.5" />
                      {pkg?.name ?? "Training Package"}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {levels.length} level{levels.length !== 1 ? "s" : ""}
                      </span>
                      {pkg && (
                        <span className="text-xs font-semibold text-card-foreground">
                          ₹{pkg.fee.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {levels.map((training) => (
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
                        <span className="text-xs text-muted-foreground shrink-0">
                          ₹{Number(training.amount ?? 0).toLocaleString()}
                        </span>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
