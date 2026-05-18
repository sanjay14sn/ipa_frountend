"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CATALOG_PENDING_SPLIT_ROW_HEIGHT } from "@/lib/catalog-line-split-layout";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import type { WaitingCI } from "@/services/ci-training-franchisee.service";

interface WaitingCICheckboxAssignPanelProps {
  waitingCIs: WaitingCI[];
  isWaitingLoading: boolean;
  onSave: (assignmentIds: number[]) => Promise<void>;
  className?: string;
}

/**
 * Same interaction pattern as {@link InventoryCheckboxLinkPanel}:
 * pending selections in an emerald summary (not yet saved), then search, then checkbox list.
 */
export function WaitingCICheckboxAssignPanel({
  waitingCIs,
  isWaitingLoading,
  onSave,
  className,
}: WaitingCICheckboxAssignPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return waitingCIs;
    const q = search.toLowerCase();
    return waitingCIs.filter(
      (ci) =>
        (ci.instructorName ?? "").toLowerCase().includes(q) ||
        (ci.instructorCode ?? "").toLowerCase().includes(q) ||
        (ci.franchiseName ?? "").toLowerCase().includes(q),
    );
  }, [waitingCIs, search]);

  const pendingCount = pendingIds.size;
  const isDirty = pendingCount > 0;

  const pendingOrdered = useMemo(() => {
    return waitingCIs.filter((c) => pendingIds.has(c.assignmentId));
  }, [waitingCIs, pendingIds]);

  function toggle(id: number) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      await onSave(Array.from(pendingIds));
      setPendingIds(new Set());
      setSearch("");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-0.5 rounded-lg border border-dashed bg-slate-50/60 px-2 py-1.5 sm:px-2 sm:py-2",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
        <h4 className="text-xs font-medium leading-tight text-gray-900 sm:text-sm">
          Assign from waiting list
        </h4>
        {isDirty ? (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes ({pendingCount})
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-1 flex min-h-0 flex-col",
          isDirty ? "grid grid-cols-1 gap-2" : "gap-2",
        )}
        style={
          isDirty
            ? {
                gridTemplateRows: `${CATALOG_PENDING_SPLIT_ROW_HEIGHT} ${CATALOG_PENDING_SPLIT_ROW_HEIGHT}`,
              }
            : { minHeight: "min(48vh, 420px)" }
        }
      >
        {isDirty ? (
          <div className="h-full min-h-0 space-y-1 overflow-y-auto rounded-md border border-emerald-200 bg-emerald-50/40 px-1 py-0.5 sm:px-1.5 sm:py-1">
            <p className="shrink-0 text-[11px] font-medium leading-tight text-emerald-900 sm:text-xs">
              {pendingCount} selected — not yet saved
            </p>
            {pendingOrdered.map((ci) => (
              <div
                key={ci.assignmentId}
                className="flex w-full flex-row flex-wrap items-center justify-between gap-2 py-0.5"
              >
                <span className="min-w-0 max-w-[50%] shrink-0 truncate text-sm font-medium text-gray-900 sm:max-w-[45%]">
                  {ci.instructorName ?? "Unknown Instructor"}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(ci.assignmentId)}
                  aria-label={`Remove ${ci.instructorName ?? "instructor"} from selection`}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm",
            isDirty ? "h-full min-h-0" : "min-h-0 flex-1",
          )}
        >
          <div className="shrink-0 border-b border-border/80 bg-muted/25 px-1.5 py-0.5 sm:px-2 sm:py-1">
            <Input
              className="h-8 border-input/80 bg-background text-sm shadow-none"
              placeholder="Search by name, code, or franchise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
            {isWaitingLoading ? (
              <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading waiting CIs...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                {waitingCIs.length === 0
                  ? "No CIs are currently waiting for this training level."
                  : "No CIs match your search."}
              </div>
            ) : (
              filtered.map((ci) => {
                const checked = pendingIds.has(ci.assignmentId);
                return (
                  <div
                    key={ci.assignmentId}
                    className={`flex items-center gap-1.5 border-b px-1.5 py-1 last:border-b-0 transition-colors sm:gap-2 sm:px-2 ${
                      checked ? "bg-emerald-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(ci.assignmentId)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }`}
                      aria-label={
                        checked
                          ? `Uncheck ${ci.instructorName ?? "instructor"}`
                          : `Check ${ci.instructorName ?? "instructor"}`
                      }
                    >
                      <Check className="h-3 w-3" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {ci.instructorName ?? "Unknown Instructor"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                        {ci.instructorCode ? <span>{ci.instructorCode}</span> : null}
                        {ci.franchiseName ? <span>{ci.franchiseName}</span> : null}
                      </div>
                    </div>

                    {checked ? (
                      <Badge className="shrink-0 border border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                        Selected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Waiting
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
