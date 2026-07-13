"use client";

import type { CustomGroupPreview } from "@/services/order.service";
import { formatRupees } from "@/lib/currency-utils";

export interface CustomMaterialsListProps {
  groups: CustomGroupPreview[];
  /** Optional resolver for a friendlier student name / level. */
  getStudentLabel?: (studentId: number) =>
    | { name?: string; level?: string }
    | undefined;
}

/**
 * Renders custom (re-order) inventory items grouped per student. Used both in
 * the live invoice summary and the order detail "Custom materials" tab.
 */
export default function CustomMaterialsList({
  groups,
  getStudentLabel,
}: CustomMaterialsListProps) {
  if (groups.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No custom materials on this order.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const label = getStudentLabel?.(g.studentId);
        const title = label?.name || g.studentName || `Student #${g.studentId}`;
        return (
          <div
            key={g.studentId}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-start gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-card-foreground ring-1 ring-border">
                Custom
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="truncate text-sm font-semibold text-card-foreground">
                    {title}
                  </span>
                  {label?.level ? (
                    <span className="text-xs text-muted-foreground">
                      · {label.level}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
                {formatRupees(g.totalPrice)}
              </span>
            </div>
            <div className="divide-y divide-border">
              {g.items.map((it) => (
                <div
                  key={it.inventoryItemId}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-card-foreground">
                    {it.name}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {formatRupees(it.unitPrice)} × {it.quantity}
                  </span>
                  <span className="w-24 text-right font-medium tabular-nums text-card-foreground">
                    {formatRupees(it.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
