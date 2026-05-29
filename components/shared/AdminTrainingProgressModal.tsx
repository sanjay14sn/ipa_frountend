"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, GraduationCap, Pencil } from "lucide-react";
import {
  getAdminCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import { setInstructorCompletionState } from "@/services/ci-training-admin.service";
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
  const [editing, setEditing] = useState(false);
  const [selectedThrough, setSelectedThrough] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
      highestCompleted || active?.displayOrder || orderedLevels[0]?.displayOrder || null,
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
      toast.error(getUserFriendlyMessage(err, "Failed to update training progress"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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

            <div className="flex items-center justify-end gap-2">
              {editing ? (
                <>
                  <Select
                    value={selectedThrough != null ? String(selectedThrough) : undefined}
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
                    {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
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
