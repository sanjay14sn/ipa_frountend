"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveCourseInstructor,
  AdminCourseInstructorData,
} from "@/services/course-instructor.service";
import {
  getTrainingLevelsByProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import { useToast } from "@/hooks/use-toast";

interface ApproveCIModalProps {
  instructor: AdminCourseInstructorData | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ApprovalPackageForm = {
  name: string;
  code: string;
  description: string;
  packageOrder: number;
  fee: string;
  trainingLevelIds: number[];
};

function validatePackageLevels(selectedIds: number[], allLevels: TrainingLevel[]) {
  if (!selectedIds.length) return "Select at least one training level.";
  const orderById = new Map(allLevels.map((level) => [level.id, level.displayOrder]));
  const orders = selectedIds
    .map((id) => orderById.get(id))
    .filter((order): order is number => Number.isFinite(order))
    .sort((a, b) => a - b);

  if (orders.length !== selectedIds.length) {
    return "Package contains an invalid level.";
  }

  for (let i = 1; i < orders.length; i += 1) {
    if (orders[i] !== orders[i - 1] + 1) {
      return "Package levels must be contiguous.";
    }
  }

  return null;
}

export default function ApproveCIModal({
  instructor,
  onClose,
  onSuccess,
}: ApproveCIModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState(oneYearLater);
  const [packages, setPackages] = useState<ApprovalPackageForm[]>([
    {
      name: "Package 1",
      code: "PKG-1",
      description: "",
      packageOrder: 1,
      fee: "",
      trainingLevelIds: [],
    },
  ]);

  const levelsQuery = useQuery({
    queryKey: ["approval-ci-levels", instructor?.programId],
    queryFn: () => getTrainingLevelsByProgram(Number(instructor?.programId)),
    enabled: Boolean(instructor?.programId),
  });

  useEffect(() => {
    setValidFrom(today);
    setValidUntil(oneYearLater);
    setPackages([
      {
        name: "Package 1",
        code: "PKG-1",
        description: "",
        packageOrder: 1,
        fee: "",
        trainingLevelIds: [],
      },
    ]);
  }, [instructor?.id, oneYearLater, today]);

  const sortedTrainingLevels = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .slice()
        .sort((a, b) =>
          a.displayOrder === b.displayOrder
            ? a.id - b.id
            : a.displayOrder - b.displayOrder,
        ),
    [levelsQuery.data],
  );

  const coveredLevelCount = useMemo(
    () => new Set(packages.flatMap((pkg) => pkg.trainingLevelIds)).size,
    [packages],
  );

  const updatePackage = (index: number, patch: Partial<ApprovalPackageForm>) => {
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === index ? { ...pkg, ...patch } : pkg,
      ),
    );
  };

  const togglePackageLevel = (index: number, levelId: number) => {
    setPackages((prev) =>
      prev.map((pkg, currentIndex) => {
        if (currentIndex !== index) return pkg;
        const hasLevel = pkg.trainingLevelIds.includes(levelId);
        return {
          ...pkg,
          trainingLevelIds: hasLevel
            ? pkg.trainingLevelIds.filter((id) => id !== levelId)
            : [...pkg.trainingLevelIds, levelId],
        };
      }),
    );
  };

  const validatePackages = (allLevels: TrainingLevel[]) => {
    if (!allLevels.length) {
      return "This program has no CI training levels to package.";
    }
    if (!packages.length) {
      return "Add at least one training package.";
    }

    const orderSet = new Set<number>();
    const codeSet = new Set<string>();
    const usedLevels = new Set<number>();

    for (const pkg of packages) {
      if (!pkg.name.trim() || !pkg.code.trim()) {
        return "Each package needs a name and code.";
      }
      if (orderSet.has(pkg.packageOrder)) {
        return "Package order must be unique.";
      }
      orderSet.add(pkg.packageOrder);

      const normalizedCode = pkg.code.trim().toLowerCase();
      if (codeSet.has(normalizedCode)) {
        return "Package code must be unique.";
      }
      codeSet.add(normalizedCode);

      const fee = Number(pkg.fee);
      if (pkg.fee.trim() === "" || !Number.isFinite(fee) || fee < 0) {
        return "Each package needs a valid fee.";
      }

      const levelError = validatePackageLevels(pkg.trainingLevelIds, allLevels);
      if (levelError) return levelError;

      for (const id of pkg.trainingLevelIds) {
        if (usedLevels.has(id)) {
          return "Training levels cannot be used in more than one package.";
        }
        usedLevels.add(id);
      }
    }

    const missingLevels = allLevels.filter((level) => !usedLevels.has(level.id));
    if (missingLevels.length) {
      return `Every CI training level must be included. Missing: ${missingLevels
        .map((level) => level.name || level.code || `Level ${level.displayOrder}`)
        .join(", ")}.`;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructor) return;

    if (!validFrom || !validUntil) {
      toast({
        title: "Validation error",
        description: "Both dates are required.",
        variant: "destructive",
      });
      return;
    }
    if (validUntil <= validFrom) {
      toast({
        title: "Validation error",
        description: "Valid until must be after valid from.",
        variant: "destructive",
      });
      return;
    }

    const levels = sortedTrainingLevels;
    const packageError = validatePackages(levels);
    if (packageError) {
      toast({
        title: "Validation error",
        description: packageError,
        variant: "destructive",
      });
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
      toast({
        title: "Instructor approved",
        description: `${instructor.name} has been approved.`,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ??
          "Failed to approve instructor. Please try again.",
        variant: "destructive",
      });
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
      <DialogContent className="sm:max-w-[720px]">
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
              <Input
                id="validFrom"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Training packages</Label>
              <span className="text-xs text-muted-foreground">
                {coveredLevelCount} / {sortedTrainingLevels.length} levels covered
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPackages((prev) => [
                    ...prev,
                    {
                      name: `Package ${prev.length + 1}`,
                      code: `PKG-${prev.length + 1}`,
                      description: "",
                      packageOrder: prev.length + 1,
                      fee: "",
                      trainingLevelIds: [],
                    },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Package
              </Button>
            </div>

            {packages.map((pkg, index) => (
              <div key={`${pkg.code}-${index}`} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Package {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={packages.length === 1}
                    onClick={() =>
                      setPackages((prev) =>
                        prev
                          .filter((_, currentIndex) => currentIndex !== index)
                          .map((item, nextIndex) => ({
                            ...item,
                            packageOrder: nextIndex + 1,
                          })),
                      )
                    }
                    aria-label="Remove package"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`package-name-${index}`}>Name</Label>
                    <Input
                      id={`package-name-${index}`}
                      value={pkg.name}
                      onChange={(event) =>
                        updatePackage(index, { name: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`package-code-${index}`}>Code</Label>
                    <Input
                      id={`package-code-${index}`}
                      value={pkg.code}
                      onChange={(event) =>
                        updatePackage(index, { code: event.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`package-fee-${index}`}>Fee</Label>
                    <Input
                      id={`package-fee-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={pkg.fee}
                      onChange={(event) =>
                        updatePackage(index, { fee: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`package-description-${index}`}>Description</Label>
                    <Input
                      id={`package-description-${index}`}
                      value={pkg.description}
                      onChange={(event) =>
                        updatePackage(index, { description: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Training levels</Label>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                    {levelsQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading levels...</p>
                    ) : sortedTrainingLevels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No CI training levels found for this program.
                      </p>
                    ) : (
                      sortedTrainingLevels.map((level) => (
                        <label
                          key={level.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={pkg.trainingLevelIds.includes(level.id)}
                            onChange={() => togglePackageLevel(index, level.id)}
                          />
                          <span>
                            {level.displayOrder}. {level.name} ({level.code})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
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
