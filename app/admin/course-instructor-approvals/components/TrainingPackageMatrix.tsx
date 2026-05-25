"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { TrainingLevel } from "@/services/training-level.service";

/**
 * Single-cell radio-styled toggle. Visually matches shadcn RadioGroupItem
 * (round border + dot when selected) but acts as a binary on/off toggle
 * — needed for the Completed column where each row's state is independent.
 */
function CompletedRadioToggle({
  checked,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background ring-offset-background transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "hover:border-primary/80",
      )}
    >
      {checked ? (
        <span aria-hidden className="block h-2 w-2 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}

export type ApprovalPackageForm = {
  name: string;
  code: string;
  description: string;
  packageOrder: number;
  fee: string;
  trainingLevelIds: number[];
  /** Only used when the matrix is rendered with `showPaidToggle`. */
  paid?: boolean;
};

export function createDefaultPackage(order: number): ApprovalPackageForm {
  return {
    name: `Package ${order}`,
    code: `PKG-${order}`,
    description: "",
    packageOrder: order,
    fee: "",
    trainingLevelIds: [],
    paid: false,
  };
}

export function sortPackageLevelIds(
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

export function getLevelSelectionErrors(
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
  const overlapped = allLevels.filter((l) => (levelCountById.get(l.id) ?? 0) > 1);
  const missing = allLevels.filter((l) => !levelCountById.has(l.id));
  return {
    overlapError: overlapped.length
      ? `Training levels cannot overlap across packages. Overlap: ${overlapped
          .map((l) => l.code || l.name || `L${l.displayOrder}`)
          .join(", ")}.`
      : null,
    missingError: missing.length
      ? `Every CI training level must be selected. Missing: ${missing
          .map((l) => l.code || l.name || `L${l.displayOrder}`)
          .join(", ")}.`
      : null,
  };
}

export function validatePackages(
  packages: ApprovalPackageForm[],
  allLevels: TrainingLevel[],
): string | null {
  if (!allLevels.length) return "This program has no CI training levels to package.";
  if (!packages.length) return "Add at least one training package.";
  const orderSet = new Set<number>();
  const codeSet = new Set<string>();
  const usedLevels = new Set<number>();
  const orderById = new Map(allLevels.map((l) => [l.id, l.displayOrder]));
  for (const pkg of packages) {
    if (!pkg.name.trim() || !pkg.code.trim()) return "Each package needs a name and code.";
    if (orderSet.has(pkg.packageOrder)) return "Package order must be unique.";
    orderSet.add(pkg.packageOrder);
    const normalized = pkg.code.trim().toLowerCase();
    if (codeSet.has(normalized)) return "Package code must be unique.";
    codeSet.add(normalized);
    const fee = pkg.fee.trim() === "" ? 0 : Number(pkg.fee);
    if (!Number.isFinite(fee) || fee < 0) return "Each package needs a valid fee.";
    if (!pkg.trainingLevelIds.length) return "Each package must include at least one level.";
    const orders = pkg.trainingLevelIds
      .map((id) => orderById.get(id))
      .filter((o): o is number => Number.isFinite(o))
      .sort((a, b) => a - b);
    for (let i = 1; i < orders.length; i += 1) {
      if (orders[i] !== orders[i - 1] + 1) return "Package levels must be contiguous.";
    }
    for (const id of pkg.trainingLevelIds) {
      if (usedLevels.has(id)) return "Levels cannot overlap across packages.";
      usedLevels.add(id);
    }
  }
  const missing = allLevels.filter((l) => !usedLevels.has(l.id));
  if (missing.length) {
    return `Every CI training level must be included. Missing: ${missing
      .map((l) => l.code || l.name || `L${l.displayOrder}`)
      .join(", ")}.`;
  }
  return null;
}

interface TrainingPackageMatrixProps {
  levels: TrainingLevel[];
  packages: ApprovalPackageForm[];
  onChangePackages: (next: ApprovalPackageForm[]) => void;
  /** When true, a leftmost "Completed?" checkbox column is rendered per row. */
  showCompletionColumn?: boolean;
  /** When true, an "Already paid?" toggle is rendered in each package header. */
  showPaidToggle?: boolean;
  /** Highest displayOrder marked completed; null = none. */
  completedThrough?: number | null;
  onCompletedThroughChange?: (next: number | null) => void;
}

export function TrainingPackageMatrix({
  levels,
  packages,
  onChangePackages,
  showCompletionColumn = false,
  showPaidToggle = false,
  completedThrough = null,
  onCompletedThroughChange,
}: TrainingPackageMatrixProps) {
  const sortedLevels = useMemo(
    () =>
      [...levels].sort((a, b) =>
        a.displayOrder === b.displayOrder ? a.id - b.id : a.displayOrder - b.displayOrder,
      ),
    [levels],
  );
  const levelOrderMap = useMemo(() => {
    const map = new Map<number, number>();
    sortedLevels.forEach((l, i) => map.set(l.id, i));
    return map;
  }, [sortedLevels]);

  const containsCompletedLevel = (pkg: ApprovalPackageForm): boolean => {
    if (!showCompletionColumn || completedThrough == null) return false;
    return pkg.trainingLevelIds.some((id) => {
      const level = sortedLevels.find((l) => l.id === id);
      return level != null && level.displayOrder <= completedThrough;
    });
  };

  const setLevelCompleted = (level: TrainingLevel, checked: boolean) => {
    if (!onCompletedThroughChange) return;
    if (checked) {
      onCompletedThroughChange(level.displayOrder);
    } else {
      const prev = level.displayOrder - 1;
      onCompletedThroughChange(prev >= 1 ? prev : null);
    }
  };

  const updatePackage = (index: number, patch: Partial<ApprovalPackageForm>) => {
    onChangePackages(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };
  const removePackage = (index: number) => {
    onChangePackages(
      packages
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, packageOrder: i + 1 })),
    );
  };
  const addPackage = () => {
    onChangePackages([...packages, createDefaultPackage(packages.length + 1)]);
  };
  const toggleLevelInMatrix = (pkgIndex: number, levelId: number) => {
    onChangePackages(
      packages.map((pkg, currentIndex) => {
        const checked = packages[pkgIndex]?.trainingLevelIds.includes(levelId);
        if (checked) {
          if (currentIndex !== pkgIndex) return pkg;
          return {
            ...pkg,
            trainingLevelIds: pkg.trainingLevelIds.filter((id) => id !== levelId),
          };
        }
        if (currentIndex === pkgIndex) {
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

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: `${420 + packages.length * 140}px` }}
        >
          <thead>
            <tr className="border-b">
              {showCompletionColumn && (
                <th className="px-3 py-2 text-left font-medium">Completed</th>
              )}
              <th className="px-3 py-2 text-left font-medium">Level</th>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              {packages.map((pkg, index) => {
                const autoPaid = containsCompletedLevel(pkg);
                return (
                  <th key={`pkg-col-${index}`} className="px-2 py-2 align-top">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={packages.length === 1}
                          onClick={() => removePackage(index)}
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
                          className="h-7 min-w-[96px] text-xs text-center"
                        />
                      </div>
                      {showPaidToggle && (
                        <label className="flex items-center justify-center gap-1 text-xs">
                          <Checkbox
                            checked={autoPaid || pkg.paid === true}
                            disabled={autoPaid}
                            onCheckedChange={(checked) =>
                              updatePackage(index, { paid: checked === true })
                            }
                          />
                          <span>{autoPaid ? "Paid" : "Already paid"}</span>
                        </label>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedLevels.map((level) => {
              const isCompleted =
                showCompletionColumn &&
                completedThrough != null &&
                level.displayOrder <= completedThrough;
              return (
                <tr
                  key={`level-${level.id}`}
                  className={`border-b last:border-b-0 ${isCompleted ? "bg-green-50/60" : ""}`}
                >
                  {showCompletionColumn && (
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center">
                        <CompletedRadioToggle
                          checked={isCompleted}
                          onToggle={() => setLevelCompleted(level, !isCompleted)}
                          ariaLabel={`Mark ${level.name || `Level ${level.displayOrder}`} as completed`}
                        />
                      </div>
                    </td>
                  )}
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
              );
            })}
            <tr className="border-t bg-muted/20">
              {showCompletionColumn && <td />}
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

      <Button type="button" variant="outline" className="w-full" onClick={addPackage}>
        <Plus className="mr-2 h-4 w-4" />
        Add package
      </Button>
    </div>
  );
}
