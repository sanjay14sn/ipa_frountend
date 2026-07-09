"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, GraduationCap, Pencil } from "lucide-react";
import {
  getCITrainingProgress,
  getAdminCITrainingProgress,
  type CITrainingProgress,
} from "@/services/course-instructor.service";
import { setInstructorCompletionState } from "@/services/ci-training-admin.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { DetailDialog, DialogProgressCard } from "@/components/shared/dialog";

export interface TrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  /**
   * "admin" adds the completed-through editor (admin service pair);
   * "franchisee" is read-only. @default "franchisee"
   */
  audience?: "admin" | "franchisee";
}

/**
 * One training-progress modal (CC-16 merge of the former shared/
 * AdminTrainingProgressModal + franchisee TrainingProgressModal — they were
 * the same modal with an admin-only level editor).
 */
export function TrainingProgressModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  audience = "franchisee",
}: TrainingProgressModalProps) {
  const isAdmin = audience === "admin";
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedThrough, setSelectedThrough] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProgress(
        isAdmin
          ? await getAdminCITrainingProgress(instructorId)
          : await getCITrainingProgress(instructorId),
      );
    } catch (err) {
      setError(getUserFriendlyMessage(err, "Failed to load training progress"));
    } finally {
      setLoading(false);
    }
  }, [instructorId, isAdmin]);

  useEffect(() => {
    if (!isOpen) return;
    void loadProgress();
  }, [isOpen, loadProgress]);

  const trainings = progress?.trainings ?? [];

  // Levels that can be marked as "completed through" — ordered by displayOrder.
  const orderedLevels = [...trainings]
    .filter((t) => t.displayOrder != null)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const highestCompleted = orderedLevels
    .filter((t) => t.isCompleted)
    .reduce((max, t) => Math.max(max, t.displayOrder ?? 0), 0);

  const startEditing = () => {
    const active = orderedLevels.find((t) => t.isActive && !t.isCompleted);
    setSelectedThrough(
      highestCompleted ||
        active?.displayOrder ||
        orderedLevels[0]?.displayOrder ||
        null,
    );
    setEditing(true);
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const saveCompletion = async () => {
    if (selectedThrough == null) return;
    setSaving(true);
    try {
      await setInstructorCompletionState(instructorId, selectedThrough);
      await loadProgress();
      toast.success("Training progress updated");
      setEditing(false);
    } catch (err) {
      toast.error(
        getUserFriendlyMessage(err, "Failed to update training progress"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailDialog
      open={isOpen}
      onOpenChange={handleClose}
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

          {isAdmin ? (
            <div className="flex items-center justify-end gap-2">
              {editing ? (
                <>
                  <Select
                    value={
                      selectedThrough != null
                        ? String(selectedThrough)
                        : undefined
                    }
                    onValueChange={(value) => setSelectedThrough(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[220px] text-sm">
                      <SelectValue placeholder="Completed through level…" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderedLevels.map((level) => (
                        <SelectItem
                          key={level.id ?? level.trainingLevelId}
                          value={String(level.displayOrder)}
                        >
                          {level.displayOrder}. {level.trainingLevelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={saveCompletion}
                    disabled={saving || selectedThrough == null}
                  >
                    {saving && (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={startEditing}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit progress
                </Button>
              )}
            </div>
          ) : null}

          <div className="divide-y divide-border rounded-lg border">
            {trainings.map((training) => (
              <div
                key={training.id ?? training.trainingLevelId}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground">
                  {training.displayOrder}
                </span>
                <span className="flex-1 truncate text-sm text-card-foreground">
                  {training.trainingLevelName}
                </span>
                {training.isCompleted && training.marks != null && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {training.marks}%
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {training.paid ? (
                    <Badge
                      variant="outline"
                      className="border-success/20 bg-success-soft px-1.5 py-0 text-xs text-success-soft-foreground"
                    >
                      Paid
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-border bg-muted px-1.5 py-0 text-xs text-muted-foreground"
                    >
                      Unpaid
                    </Badge>
                  )}
                  {training.isCompleted && (
                    <Badge
                      variant="outline"
                      className="border-success/20 bg-success-soft px-1.5 py-0 text-xs text-success-soft-foreground"
                    >
                      Completed
                    </Badge>
                  )}
                  {training.isActive && !training.isCompleted && (
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning-soft px-1.5 py-0 text-xs text-warning-soft-foreground"
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
