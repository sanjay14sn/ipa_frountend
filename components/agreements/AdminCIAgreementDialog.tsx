"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import {
  getAdminCourseInstructorAgreement,
  upsertAdminCourseInstructorTrainingPackages,
  type AdminCourseInstructorAgreementRecord,
  type ApproveCourseInstructorTrainingPackage,
} from "@/services/course-instructor.service";
import { getTrainingLevelsByProgram, type TrainingLevel } from "@/services/training-level.service";
import type { CIAgreementRecord } from "@/services/ci-training.service";
import { useToast } from "@/hooks/use-toast";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";

interface AdminCIAgreementDialogProps {
  instructor: { id: number; name?: string; programId?: number } | null;
  onClose: () => void;
}

type PackageForm = {
  name: string;
  code: string;
  description: string;
  packageOrder: number;
  fee: string;
  trainingLevelIds: number[];
};

function createDefaultPackage(order: number): PackageForm {
  return {
    name: `Package ${order}`,
    code: `PKG-${order}`,
    description: "",
    packageOrder: order,
    fee: "",
    trainingLevelIds: [],
  };
}

function mapPackagesToForm(
  packages: Array<{
    name: string;
    code: string;
    description?: string | null;
    packageOrder: number;
    fee: number;
    trainingLevelIds: number[];
  }>,
): PackageForm[] {
  if (!packages.length) return [createDefaultPackage(1)];
  return packages
    .slice()
    .sort((a, b) => a.packageOrder - b.packageOrder)
    .map((pkg, index) => ({
      name: pkg.name ?? `Package ${index + 1}`,
      code: pkg.code ?? `PKG-${index + 1}`,
      description: pkg.description ?? "",
      packageOrder: index + 1,
      fee: (() => {
        const raw = pkg.fee;
        if (raw === null || raw === undefined) return "";
        const n = Number(raw);
        return Number.isFinite(n) && n === 0 ? "" : String(raw);
      })(),
      trainingLevelIds: Array.isArray(pkg.trainingLevelIds)
        ? [...new Set(pkg.trainingLevelIds)]
        : [],
    }));
}

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

function validatePackages(packages: PackageForm[], allLevels: TrainingLevel[]) {
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

    const feeStr = pkg.fee.trim();
    const fee = feeStr === "" ? 0 : Number(pkg.fee);
    if (!Number.isFinite(fee) || fee < 0) {
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
}

function sortPackageLevelIds(
  levelIds: number[],
  orderMap: Map<number, number>,
): number[] {
  return [...new Set(levelIds)].sort((a, b) => {
    const aOrder = orderMap.get(a);
    const bOrder = orderMap.get(b);
    if (aOrder == null && bOrder == null) return a - b;
    if (aOrder == null) return 1;
    if (bOrder == null) return -1;
    return aOrder - bOrder;
  });
}

function formatLevelTitle(level: TrainingLevel) {
  const label = level.name || `Level ${level.displayOrder}`;
  return `${label} (${level.code})`;
}

function getLevelSelectionErrors(
  packages: PackageForm[],
  allLevels: TrainingLevel[],
): { overlapError: string | null; missingError: string | null } {
  if (!allLevels.length) {
    return { overlapError: null, missingError: null };
  }

  const levelCountById = new Map<number, number>();
  for (const pkg of packages) {
    for (const levelId of pkg.trainingLevelIds) {
      levelCountById.set(levelId, (levelCountById.get(levelId) ?? 0) + 1);
    }
  }

  const overlappedLevels = allLevels.filter(
    (level) => (levelCountById.get(level.id) ?? 0) > 1,
  );
  const missingLevels = allLevels.filter(
    (level) => !levelCountById.has(level.id),
  );

  const overlapError = overlappedLevels.length
    ? `Training levels cannot overlap across packages. Overlap: ${overlappedLevels
        .map((level) => level.code || level.name || `L${level.displayOrder}`)
        .join(", ")}.`
    : null;

  const missingError = missingLevels.length
    ? `Every CI training level must be selected. Missing: ${missingLevels
        .map((level) => level.code || level.name || `L${level.displayOrder}`)
        .join(", ")}.`
    : null;

  return { overlapError, missingError };
}

export function AdminCIAgreementDialog({
  instructor,
  onClose,
}: AdminCIAgreementDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditingPackages, setIsEditingPackages] = useState(false);
  const [packageEditorView, setPackageEditorView] = useState<"matrix" | "preview">(
    "matrix",
  );
  const [packages, setPackages] = useState<PackageForm[]>([createDefaultPackage(1)]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ci-agreement", instructor?.id],
    queryFn: () => getAdminCourseInstructorAgreement(instructor!.id),
    enabled: !!instructor,
  });

  const programId = instructor?.programId ?? data?.trainingPackages?.[0]?.programId;

  const levelsQuery = useQuery({
    queryKey: ["admin-ci-levels", programId],
    queryFn: () => getTrainingLevelsByProgram(Number(programId)),
    enabled: !!instructor && Number.isFinite(Number(programId)),
  });

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
  const levelSelectionErrors = useMemo(
    () => getLevelSelectionErrors(packages, sortedTrainingLevels),
    [packages, sortedTrainingLevels],
  );
  const levelOrderMap = useMemo(() => {
    const map = new Map<number, number>();
    sortedTrainingLevels.forEach((level, index) => {
      map.set(level.id, index);
    });
    return map;
  }, [sortedTrainingLevels]);

  useEffect(() => {
    if (!instructor) {
      setIsEditingPackages(false);
      setPackageEditorView("matrix");
      setPackages([createDefaultPackage(1)]);
      return;
    }
    setIsEditingPackages(false);
    setPackageEditorView("matrix");
    setPackages(mapPackagesToForm(data?.trainingPackages ?? []));
  }, [instructor?.id, data?.trainingPackages]);

  const savePackagesMutation = useMutation({
    mutationFn: async (payload: ApproveCourseInstructorTrainingPackage[]) =>
      upsertAdminCourseInstructorTrainingPackages(instructor!.id, {
        trainingPackages: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-ci-agreement", instructor?.id],
      });
      toast({
        title: "Training packages saved",
        description: "CI training packages were updated successfully.",
      });
      setIsEditingPackages(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save packages",
        description:
          error?.response?.data?.message ??
          "Could not update CI training packages.",
        variant: "destructive",
      });
    },
  });

  const updatePackage = (index: number, patch: Partial<PackageForm>) => {
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
        .map((item, nextIndex) => ({
          ...item,
          packageOrder: nextIndex + 1,
        })),
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

  const handleSavePackages = () => {
    if (!instructor) return;
    if (!programId) {
      toast({
        title: "Missing program",
        description: "Program information is required to manage CI packages.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validatePackages(packages, sortedTrainingLevels);
    if (validationError) {
      toast({
        title: "Validation error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    savePackagesMutation.mutate(
      packages.map((pkg) => ({
        name: pkg.name.trim() || `Package ${pkg.packageOrder}`,
        code: pkg.code.trim(),
        description: pkg.description.trim() || undefined,
        packageOrder: pkg.packageOrder,
        fee: Number(pkg.fee),
        trainingLevelIds: pkg.trainingLevelIds,
      })),
    );
  };

  const canEdit = !!instructor && !!programId;
  const isSaving = savePackagesMutation.isPending;
  const packageSectionActions = canEdit ? (
    isEditingPackages ? (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={packageEditorView === "matrix" ? "default" : "outline"}
          size="sm"
          onClick={() => setPackageEditorView("matrix")}
        >
          Matrix view
        </Button>
        <Button
          type="button"
          variant={packageEditorView === "preview" ? "default" : "outline"}
          size="sm"
          onClick={() => setPackageEditorView("preview")}
        >
          Preview
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isSaving}
        onClick={() => setIsEditingPackages(true)}
      >
        Edit training packages
      </Button>
    )
  ) : null;

  const packageSectionContent = isEditingPackages ? (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">
        {coveredLevelCount} / {sortedTrainingLevels.length} levels covered
      </div>
      {levelSelectionErrors.overlapError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {levelSelectionErrors.overlapError}
        </div>
      ) : null}
      {levelSelectionErrors.missingError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {levelSelectionErrors.missingError}
        </div>
      ) : null}

      {levelsQuery.isLoading ? (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading levels...
        </div>
      ) : sortedTrainingLevels.length === 0 ? (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          No CI training levels found for this program.
        </div>
      ) : packageEditorView === "matrix" ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-[760px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">Level</th>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                {packages.map((pkg, index) => (
                  <th key={`pkg-col-${index}`} className="px-2 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={packages.length === 1}
                        onClick={() => removePackageAtIndex(index)}
                        aria-label="Remove package"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Input
                        value={pkg.code}
                        onChange={(event) =>
                          updatePackage(index, {
                            code: event.target.value,
                            name: event.target.value.trim() || pkg.name,
                          })
                        }
                        placeholder={`P${index + 1}`}
                        className="h-8 min-w-[92px]"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTrainingLevels.map((level) => (
                <tr key={`level-${level.id}`} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{formatLevelTitle(level)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{level.code}</td>
                  {packages.map((pkg, packageIndex) => (
                    <td key={`level-${level.id}-pkg-${pkg.packageOrder}`} className="px-2 py-2 text-center">
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
                      onChange={(event) =>
                        updatePackage(index, { fee: event.target.value })
                      }
                      onFocus={selectInputValueOnFocus}
                      className="h-9 text-center"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg, index) => (
            <div key={`preview-${pkg.packageOrder}`} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{pkg.name || `Package ${index + 1}`}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={packages.length === 1}
                  onClick={() => removePackageAtIndex(index)}
                  aria-label="Remove package"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={pkg.code}
                  onChange={(event) =>
                    updatePackage(index, {
                      code: event.target.value,
                      name: event.target.value.trim() || pkg.name,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fee (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkg.fee}
                  onChange={(event) =>
                    updatePackage(index, { fee: event.target.value })
                  }
                  onFocus={selectInputValueOnFocus}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Levels:{" "}
                {pkg.trainingLevelIds
                  .map((id) => sortedTrainingLevels.find((level) => level.id === id)?.code ?? id)
                  .join(", ") || "None"}
              </p>
            </div>
          ))}
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

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => {
            setIsEditingPackages(false);
            setPackageEditorView("matrix");
            setPackages(mapPackagesToForm(data?.trainingPackages ?? []));
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isSaving || levelsQuery.isLoading}
          onClick={handleSavePackages}
        >
          {isSaving ? "Saving..." : "Save packages"}
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <Dialog
      open={!!instructor}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto sm:max-w-[1320px]">
        <DialogHeader>
          <DialogTitle>Course Instructor Agreement</DialogTitle>
          <DialogDescription>
            {instructor?.name ? `Agreement view for ${instructor.name}` : "Agreement view"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agreement...
          </div>
        ) : !data ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No CI agreement found for this instructor.
          </div>
        ) : (
          <CIAgreementDetail
            agreement={data as unknown as CIAgreementRecord}
            packageSectionActions={packageSectionActions}
            packageSectionContent={packageSectionContent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { AdminCourseInstructorAgreementRecord };
