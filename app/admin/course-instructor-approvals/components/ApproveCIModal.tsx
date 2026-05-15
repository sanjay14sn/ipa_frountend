"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
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
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import { getUserFriendlyMessage } from "@/lib/error-utils";

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

function createDefaultPackage(order: number): ApprovalPackageForm {
  return {
    name: `Package ${order}`,
    code: `PKG-${order}`,
    description: "",
    packageOrder: order,
    fee: "",
    trainingLevelIds: [],
  };
}

function sortPackageLevelIds(levelIds: number[], orderMap: Map<number, number>): number[] {
  return [...new Set(levelIds)].sort((a, b) => {
    const aOrder = orderMap.get(a);
    const bOrder = orderMap.get(b);
    if (aOrder == null && bOrder == null) return a - b;
    if (aOrder == null) return 1;
    if (bOrder == null) return -1;
    return aOrder - bOrder;
  });
}

function getLevelSelectionErrors(
  packages: ApprovalPackageForm[],
  allLevels: TrainingLevel[],
): { overlapError: string | null; missingError: string | null } {
  if (!allLevels.length) return { overlapError: null, missingError: null };

  const levelCountById = new Map<number, number>();
  for (const pkg of packages) {
    for (const levelId of pkg.trainingLevelIds) {
      levelCountById.set(levelId, (levelCountById.get(levelId) ?? 0) + 1);
    }
  }

  const overlappedLevels = allLevels.filter((level) => (levelCountById.get(level.id) ?? 0) > 1);
  const missingLevels = allLevels.filter((level) => !levelCountById.has(level.id));

  return {
    overlapError: overlappedLevels.length
      ? `Training levels cannot overlap across packages. Overlap: ${overlappedLevels
          .map((l) => l.code || l.name || `L${l.displayOrder}`)
          .join(", ")}.`
      : null,
    missingError: missingLevels.length
      ? `Every CI training level must be selected. Missing: ${missingLevels
          .map((l) => l.code || l.name || `L${l.displayOrder}`)
          .join(", ")}.`
      : null,
  };
}

function validatePackageLevels(selectedIds: number[], allLevels: TrainingLevel[]) {
  if (!selectedIds.length) return "Select at least one training level.";
  const orderById = new Map(allLevels.map((level) => [level.id, level.displayOrder]));
  const orders = selectedIds
    .map((id) => orderById.get(id))
    .filter((order): order is number => Number.isFinite(order))
    .sort((a, b) => a - b);

  if (orders.length !== selectedIds.length) return "Package contains an invalid level.";

  for (let i = 1; i < orders.length; i += 1) {
    if (orders[i] !== orders[i - 1] + 1) return "Package levels must be contiguous.";
  }

  return null;
}

function validatePackages(packages: ApprovalPackageForm[], allLevels: TrainingLevel[]) {
  if (!allLevels.length) return "This program has no CI training levels to package.";
  if (!packages.length) return "Add at least one training package.";

  const orderSet = new Set<number>();
  const codeSet = new Set<string>();
  const usedLevels = new Set<number>();

  for (const pkg of packages) {
    if (!pkg.name.trim() || !pkg.code.trim()) return "Each package needs a name and code.";
    if (orderSet.has(pkg.packageOrder)) return "Package order must be unique.";
    orderSet.add(pkg.packageOrder);

    const normalizedCode = pkg.code.trim().toLowerCase();
    if (codeSet.has(normalizedCode)) return "Package code must be unique.";
    codeSet.add(normalizedCode);

    const feeStr = pkg.fee.trim();
    const fee = feeStr === "" ? 0 : Number(pkg.fee);
    if (!Number.isFinite(fee) || fee < 0)
      return "Each package needs a valid fee.";

    const levelError = validatePackageLevels(pkg.trainingLevelIds, allLevels);
    if (levelError) return levelError;

    for (const id of pkg.trainingLevelIds) {
      if (usedLevels.has(id)) return "Training levels cannot be used in more than one package.";
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
}

export default function ApproveCIModal({
  instructor,
  onClose,
  onSuccess,
}: ApproveCIModalProps) {
  const { toast } = useToast();
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

  const levelOrderMap = useMemo(() => {
    const map = new Map<number, number>();
    sortedTrainingLevels.forEach((level, index) => map.set(level.id, index));
    return map;
  }, [sortedTrainingLevels]);

  const coveredLevelCount = useMemo(
    () => new Set(packages.flatMap((pkg) => pkg.trainingLevelIds)).size,
    [packages],
  );

  const levelSelectionErrors = useMemo(
    () => getLevelSelectionErrors(packages, sortedTrainingLevels),
    [packages, sortedTrainingLevels],
  );

  const updatePackage = (index: number, patch: Partial<ApprovalPackageForm>) => {
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === index ? { ...pkg, ...patch } : pkg,
      ),
    );
  };

  const removePackageAtIndex = (index: number) => {
    setPackages((prev) =>
      prev
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, nextIndex) => ({ ...item, packageOrder: nextIndex + 1 })),
    );
  };

  const toggleLevelInMatrix = (packageIndex: number, levelId: number) => {
    setPackages((prev) =>
      prev.map((pkg, currentIndex) => {
        const checked = prev[packageIndex]?.trainingLevelIds.includes(levelId);
        if (checked) {
          if (currentIndex !== packageIndex) return pkg;
          return {
            ...pkg,
            trainingLevelIds: pkg.trainingLevelIds.filter((id) => id !== levelId),
          };
        }
        if (currentIndex === packageIndex) {
          return {
            ...pkg,
            trainingLevelIds: sortPackageLevelIds(
              [...pkg.trainingLevelIds, levelId],
              levelOrderMap,
            ),
          };
        }
        return {
          ...pkg,
          trainingLevelIds: pkg.trainingLevelIds.filter((id) => id !== levelId),
        };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructor) return;

    if (!validFrom || !validUntil) {
      toast({ title: "Validation error", description: "Both dates are required.", variant: "destructive" });
      return;
    }
    if (validUntil <= validFrom) {
      toast({ title: "Validation error", description: "Valid until must be after valid from.", variant: "destructive" });
      return;
    }

    const packageError = validatePackages(packages, sortedTrainingLevels);
    if (packageError) {
      toast({ title: "Validation error", description: packageError, variant: "destructive" });
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
      toast({ title: "Instructor approved", description: `${instructor.name} has been approved.` });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(
          error,
          "Failed to approve instructor. Please try again.",
        ),
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
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm" style={{ minWidth: `${420 + packages.length * 140}px` }}>
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium">Level</th>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      {packages.map((pkg, index) => (
                        <th key={`pkg-col-${index}`} className="px-2 py-2 align-top">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                disabled={packages.length === 1}
                                onClick={() => removePackageAtIndex(index)}
                                aria-label="Remove package"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                value={pkg.code}
                                onChange={(e) =>
                                  updatePackage(index, {
                                    code: e.target.value,
                                    name: e.target.value.trim() || pkg.name,
                                  })
                                }
                                placeholder={`P${index + 1}`}
                                className="h-7 min-w-[96px] text-xs"
                              />
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrainingLevels.map((level) => (
                      <tr key={`level-${level.id}`} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">
                          {level.name || `Level ${level.displayOrder}`}{" "}
                          <span className="text-xs text-muted-foreground">({level.code})</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{level.code}</td>
                        {packages.map((pkg, packageIndex) => (
                          <td
                            key={`level-${level.id}-pkg-${pkg.packageOrder}`}
                            className="px-2 py-2 text-center"
                          >
                            <input
                              type="checkbox"
                              checked={pkg.trainingLevelIds.includes(level.id)}
                              onChange={() => toggleLevelInMatrix(packageIndex, level.id)}
                              className="h-4 w-4"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/20">
                      <td className="px-3 py-2 font-medium">Fee (₹)</td>
                      <td className="px-3 py-2" />
                      {packages.map((pkg, index) => (
                        <td key={`fee-${pkg.packageOrder}`} className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pkg.fee}
                            onChange={(e) => updatePackage(index, { fee: e.target.value })}
                            onFocus={selectInputValueOnFocus}
                            placeholder="0"
                            className="h-8 text-center"
                            required
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setPackages((prev) => [...prev, createDefaultPackage(prev.length + 1)])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add package
            </Button>
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
