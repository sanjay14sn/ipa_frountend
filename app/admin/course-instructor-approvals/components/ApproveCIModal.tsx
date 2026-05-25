"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  approveCourseInstructor,
  AdminCourseInstructorData,
} from "@/services/course-instructor.service";
import { getTrainingLevelsByProgram } from "@/services/training-level.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  TrainingPackageMatrix,
  type ApprovalPackageForm,
  createDefaultPackage,
  getLevelSelectionErrors,
  validatePackages,
} from "./TrainingPackageMatrix";

interface ApproveCIModalProps {
  instructor: AdminCourseInstructorData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveCIModal({
  instructor,
  onClose,
  onSuccess,
}: ApproveCIModalProps) {
  const [loading, setLoading] = useState(false);

  const { today, oneYearLater } = useMemo(() => {
    const t = new Date();
    const from = t.toISOString().slice(0, 10);
    const until = new Date(t.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return { today: from, oneYearLater: until };
  }, [instructor?.id]);

  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState(oneYearLater);
  const [packages, setPackages] = useState<ApprovalPackageForm[]>([createDefaultPackage(1)]);

  const levelsQuery = useQuery({
    queryKey: ["approval-ci-levels", instructor?.programId],
    queryFn: () => getTrainingLevelsByProgram(Number(instructor?.programId)),
    enabled: Boolean(instructor?.programId),
  });

  useEffect(() => {
    setValidFrom(today);
    setValidUntil(oneYearLater);
    setPackages([createDefaultPackage(1)]);
  }, [instructor?.id, oneYearLater, today]);

  const sortedTrainingLevels = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .slice()
        .sort((a, b) =>
          a.displayOrder === b.displayOrder ? a.id - b.id : a.displayOrder - b.displayOrder,
        ),
    [levelsQuery.data],
  );

  const coveredLevelCount = useMemo(
    () => new Set(packages.flatMap((pkg) => pkg.trainingLevelIds)).size,
    [packages],
  );

  const levelSelectionErrors = useMemo(
    () => getLevelSelectionErrors(packages, sortedTrainingLevels),
    [packages, sortedTrainingLevels],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructor) return;

    if (!validFrom || !validUntil) {
      toast.error("Both dates are required.");
      return;
    }
    if (validUntil <= validFrom) {
      toast.error("Valid until must be after valid from.");
      return;
    }

    const packageError = validatePackages(packages, sortedTrainingLevels);
    if (packageError) {
      toast.error(packageError);
      return;
    }

    setLoading(true);
    try {
      await approveCourseInstructor(instructor.id, {
        validFrom,
        validUntil,
        trainingPackages: packages.map((pkg) => ({
          name: pkg.name.trim(),
          code: pkg.code.trim(),
          description: pkg.description.trim() || undefined,
          packageOrder: pkg.packageOrder,
          fee: Number(pkg.fee),
          trainingLevelIds: pkg.trainingLevelIds,
        })),
      });
      toast.success(`${instructor.name} has been approved.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(getUserFriendlyMessage(error, "Failed to approve instructor. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!instructor}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Approve Course Instructor</DialogTitle>
          <DialogDescription>
            Set validity period and CI-specific training packages for{" "}
            <strong>{instructor?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <DateInput
                id="validFrom"
                value={validFrom}
                onChange={(v) => setValidFrom(v)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <DateInput
                id="validUntil"
                value={validUntil}
                onChange={(v) => setValidUntil(v)}
                required
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Training packages</Label>
              <span className="text-xs text-muted-foreground">
                {coveredLevelCount} / {sortedTrainingLevels.length} levels covered
              </span>
            </div>

            {levelSelectionErrors.overlapError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {levelSelectionErrors.overlapError}
              </div>
            )}
            {levelSelectionErrors.missingError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {levelSelectionErrors.missingError}
              </div>
            )}

            {levelsQuery.isLoading ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Loading levels...
              </div>
            ) : sortedTrainingLevels.length === 0 ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                No CI training levels found for this program.
              </div>
            ) : (
              <TrainingPackageMatrix
                levels={sortedTrainingLevels}
                packages={packages}
                onChangePackages={setPackages}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || levelsQuery.isLoading}>
              {loading ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
