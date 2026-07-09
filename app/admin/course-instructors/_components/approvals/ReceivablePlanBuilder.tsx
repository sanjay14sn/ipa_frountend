"use client";

import { useMemo } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { TrainingLevel } from "@/services/training-level.service";

export interface ReceivablePlanRow {
  label: string;
  levelFrom: number;
  levelTo: number;
  fee: string;
  paid: boolean;
}

export function validateReceivablePlan(
  rows: ReceivablePlanRow[],
  levels: TrainingLevel[],
): string | null {
  if (!levels.length) return "No CI training levels found for this program.";
  if (!rows.length) return "Add at least one receivable.";

  const sortedOrders = [...new Set(levels.map((l) => l.displayOrder))].sort(
    (a, b) => a - b,
  );
  const orderIndexMap = new Map(sortedOrders.map((o, i) => [o, i]));
  const minOrder = sortedOrders[0];
  const maxOrder = sortedOrders[sortedOrders.length - 1];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.label.trim()) return `Receivable ${i + 1} needs a label.`;
    if (!orderIndexMap.has(row.levelFrom))
      return `Receivable ${i + 1}: invalid "from" level.`;
    if (!orderIndexMap.has(row.levelTo))
      return `Receivable ${i + 1}: invalid "to" level.`;
    if (row.levelFrom > row.levelTo)
      return `Receivable ${i + 1}: "from" level must be ≤ "to" level.`;
    const fee = row.fee.trim() === "" ? 0 : Number(row.fee);
    if (!Number.isFinite(fee) || fee < 0)
      return `Receivable ${i + 1} needs a valid fee (0 or more).`;
  }

  const sorted = [...rows].sort((a, b) => a.levelFrom - b.levelFrom);

  if (sorted[0].levelFrom !== minOrder)
    return `Receivables must start from level ${minOrder}.`;
  if (sorted[sorted.length - 1].levelTo !== maxOrder)
    return `Receivables must end at level ${maxOrder}.`;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.levelFrom <= prev.levelTo)
      return `"${prev.label}" and "${curr.label}" overlap.`;
    const prevToIdx = orderIndexMap.get(prev.levelTo)!;
    const nextExpected = sortedOrders[prevToIdx + 1];
    if (nextExpected == null || curr.levelFrom !== nextExpected)
      return `Gap between "${prev.label}" (ends level ${prev.levelTo}) and "${curr.label}" (starts level ${curr.levelFrom}).`;
  }

  return null;
}

interface ReceivablePlanBuilderProps {
  levels: TrainingLevel[];
  rows: ReceivablePlanRow[];
  onChange: (rows: ReceivablePlanRow[]) => void;
  showPaid?: boolean;
}

export function ReceivablePlanBuilder({
  levels,
  rows,
  onChange,
  showPaid = false,
}: ReceivablePlanBuilderProps) {
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.displayOrder - b.displayOrder),
    [levels],
  );
  const sortedOrders = useMemo(
    () => [...new Set(sortedLevels.map((l) => l.displayOrder))],
    [sortedLevels],
  );
  const levelByOrder = useMemo(
    () => new Map(sortedLevels.map((l) => [l.displayOrder, l])),
    [sortedLevels],
  );
  const maxOrder = sortedOrders[sortedOrders.length - 1] ?? 1;

  const updateRow = (index: number, patch: Partial<ReceivablePlanRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const firstOrder = sortedOrders[0] ?? 1;
    const afterLast = lastRow
      ? sortedOrders.find((o) => o > lastRow.levelTo) ?? maxOrder
      : firstOrder;
    onChange([
      ...rows,
      {
        label: `Receivable ${rows.length + 1}`,
        levelFrom: afterLast,
        levelTo: maxOrder,
        fee: "",
        paid: false,
      },
    ]);
  };

  type GapStatus = { type: "ok" | "gap" | "overlap"; message: string };

  const getGapStatus = (i: number): GapStatus | null => {
    if (i >= rows.length - 1) return null;
    const curr = rows[i];
    const next = rows[i + 1];
    if (next.levelFrom <= curr.levelTo) {
      return {
        type: "overlap",
        message: `Overlaps at level ${next.levelFrom}`,
      };
    }
    const currToIdx = sortedOrders.indexOf(curr.levelTo);
    const nextExpected = currToIdx >= 0 ? sortedOrders[currToIdx + 1] : undefined;
    if (nextExpected != null && next.levelFrom === nextExpected) {
      const levelName =
        levelByOrder.get(nextExpected)?.name ?? `Level ${nextExpected}`;
      return { type: "ok", message: `Continues at ${levelName}` };
    }
    return {
      type: "gap",
      message: `Gap between level ${curr.levelTo} and level ${next.levelFrom}`,
    };
  };

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const gapStatus = getGapStatus(i);
        return (
          <div key={i}>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>

              <Input
                value={row.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
                placeholder={`Receivable ${i + 1}`}
                className="h-8 w-[120px] text-sm"
              />

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Levels</span>
                <Select
                  value={String(row.levelFrom)}
                  onValueChange={(v) => updateRow(i, { levelFrom: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-[130px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedLevels.map((l) => (
                      <SelectItem key={l.id} value={String(l.displayOrder)}>
                        {l.name || `Level ${l.displayOrder}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">–</span>
                <Select
                  value={String(row.levelTo)}
                  onValueChange={(v) => updateRow(i, { levelTo: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-[130px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedLevels.map((l) => (
                      <SelectItem key={l.id} value={String(l.displayOrder)}>
                        {l.name || `Level ${l.displayOrder}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={row.fee}
                  onChange={(e) => updateRow(i, { fee: e.target.value })}
                  onFocus={selectInputValueOnFocus}
                  placeholder="0"
                  className="h-8 w-[96px] text-sm"
                />
              </div>

              {showPaid && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={row.paid}
                    onCheckedChange={(c) => updateRow(i, { paid: c === true })}
                  />
                  <span>Already paid</span>
                </label>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={rows.length === 1}
                onClick={() => removeRow(i)}
                aria-label="Remove receivable"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {gapStatus && (
              <div
                className={cn(
                  "ml-3 flex items-center gap-1.5 py-1 text-xs",
                  gapStatus.type === "ok"
                    ? "text-muted-foreground"
                    : "text-destructive",
                )}
              >
                {gapStatus.type !== "ok" && (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                {gapStatus.message}
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" className="w-full" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        Add receivable
      </Button>
    </div>
  );
}
