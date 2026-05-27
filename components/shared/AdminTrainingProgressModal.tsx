"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Package, Pencil } from "lucide-react";
import {
  getAdminCITrainingProgress,
  getAdminCITrainingPackages,
  editAdminCITrainingCompletionState,
  CITrainingProgress,
  CITrainingPackage,
} from "@/services/course-instructor.service";
import {
  getTrainingLevelsByProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import {
  TrainingPackageMatrix,
  type ApprovalPackageForm,
} from "@/app/admin/course-instructor-approvals/components/TrainingPackageMatrix";
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
  programId,
}: AdminTrainingProgressModalProps) {
  const [progress, setProgress] = useState<CITrainingProgress | null>(null);
  const [packages, setPackages] = useState<CITrainingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [levels, setLevels] = useState<TrainingLevel[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [completedThrough, setCompletedThrough] = useState<number | null>(null);
  const [editPackages, setEditPackages] = useState<ApprovalPackageForm[]>([]);
  const [saving, setSaving] = useState(false);

  const loadProgressAndPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prog, pkgs] = await Promise.all([
        getAdminCITrainingProgress(instructorId),
        getAdminCITrainingPackages(instructorId),
      ]);
      setProgress(prog);
      setPackages(pkgs.sort((a, b) => a.packageOrder - b.packageOrder));
    } catch (err) {
      setError(getUserFriendlyMessage(err, "Failed to load training progress"));
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    if (!isOpen) return;
    setMode("view");
    loadProgressAndPackages();
  }, [isOpen, loadProgressAndPackages]);

  const trainings = progress?.trainings ?? [];

  const lockedPaidPackageOrders = useMemo(() => {
    const set = new Set<number>();
    if (!packages.length || !trainings.length) return set;
    const paidByLevel = new Map<number, boolean>();
    for (const t of trainings) paidByLevel.set(t.trainingLevelId, Boolean(t.paid));
    for (const pkg of packages) {
      const levelIds = pkg.trainingLevelIds ?? [];
      if (
        levelIds.length > 0 &&
        levelIds.every((id) => paidByLevel.get(id) === true)
      ) {
        set.add(pkg.packageOrder);
      }
    }
    return set;
  }, [packages, trainings]);

  const initialCompletedThrough = useMemo(() => {
    let max: number | null = null;
    for (const t of trainings) {
      if (t.isCompleted && t.displayOrder != null) {
        max = max == null ? t.displayOrder : Math.max(max, t.displayOrder);
      }
    }
    return max;
  }, [trainings]);

  const enterEditMode = async () => {
    setMode("edit");
    setEditError(null);
    setCompletedThrough(initialCompletedThrough);
    setEditPackages(
      packages.map<ApprovalPackageForm>((p) => ({
        name: p.name,
        code: p.code ?? "",
        description: p.description ?? "",
        packageOrder: p.packageOrder,
        fee: String(p.fee ?? 0),
        trainingLevelIds: [...(p.trainingLevelIds ?? [])],
        paid: lockedPaidPackageOrders.has(p.packageOrder),
      })),
    );

    if (levels.length === 0) {
      setEditLoading(true);
      try {
        const data = await getTrainingLevelsByProgram(programId);
        setLevels(data);
      } catch (err) {
        setEditError(
          getUserFriendlyMessage(err, "Failed to load training levels"),
        );
      } finally {
        setEditLoading(false);
      }
    }
  };

  const cancelEdit = () => {
    setMode("view");
    setEditError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setEditError(null);
    try {
      await editAdminCITrainingCompletionState(instructorId, {
        completedThrough,
        packagePaidFlags: editPackages.map((p) => ({
          packageOrder: p.packageOrder,
          paid:
            lockedPaidPackageOrders.has(p.packageOrder) || p.paid === true,
        })),
      });
      toast.success("Training progress updated");
      setMode("view");
      await loadProgressAndPackages();
    } catch (err) {
      setEditError(
        getUserFriendlyMessage(err, "Failed to update training progress"),
      );
    } finally {
      setSaving(false);
    }
  };

  const packageGroups: Array<{ pkg: CITrainingPackage | null; levels: typeof trainings }> = [];

  if (packages.length > 0) {
    for (const pkg of packages) {
      const lvls = trainings.filter((t) =>
        pkg.trainingLevelIds.includes(t.trainingLevelId),
      );
      if (lvls.length > 0) packageGroups.push({ pkg, levels: lvls });
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Training Progress — {instructorName}
              </DialogTitle>
              <DialogDescription>
                {mode === "view"
                  ? "Sequential training levels and completion status"
                  : "Edit completion and paid state for this CI"}
              </DialogDescription>
            </div>
            {mode === "view" && !loading && !error && trainings.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={enterEditMode}
                className="shrink-0"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
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
        ) : mode === "view" ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress.completedTrainings ?? 0} of {progress.totalTrainings ?? 0} completed</span>
                <span>{Math.round(progress.progress ?? 0)}%</span>
              </div>
              <Progress value={progress.progress ?? 0} className="h-1.5" />
            </div>

            <div className="space-y-4">
              {packageGroups.map(({ pkg, levels: lvls }, idx) => (
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
                        {lvls.length} level{lvls.length !== 1 ? "s" : ""}
                      </span>
                      {pkg && (
                        <span className="text-xs font-semibold text-card-foreground">
                          ₹{pkg.fee.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {lvls.map((training) => (
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
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/10 p-3 text-sm">
              <strong>Tip:</strong> Check the "Completed" radio on the highest level
              the CI has finished. All levels up to that point are auto-marked
              complete. Packages containing a completed level are locked as Paid.
              Already-paid packages cannot be reverted.
            </div>

            {editLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : levels.length === 0 ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                No CI training levels found for the program.
              </div>
            ) : (
              <TrainingPackageMatrix
                levels={levels}
                packages={editPackages}
                onChangePackages={setEditPackages}
                showCompletionColumn
                showPaidToggle
                completedThrough={completedThrough}
                onCompletedThroughChange={setCompletedThrough}
                lockPackageStructure
                lockedPaidPackageOrders={lockedPaidPackageOrders}
              />
            )}

            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || editLoading || levels.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
