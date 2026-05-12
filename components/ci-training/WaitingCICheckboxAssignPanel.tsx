"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import type { WaitingCI } from "@/services/ci-training-franchisee.service";

interface WaitingCICheckboxAssignPanelProps {
  waitingCIs: WaitingCI[];
  isWaitingLoading: boolean;
  onSave: (assignmentIds: number[]) => Promise<void>;
}

/**
 * Same interaction pattern as {@link InventoryCheckboxLinkPanel}:
 * pending selections in an emerald summary (not yet saved), then search, then checkbox list.
 */
export function WaitingCICheckboxAssignPanel({
  waitingCIs,
  isWaitingLoading,
  onSave,
}: WaitingCICheckboxAssignPanelProps) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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
      toast({
        title: "Failed to save",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900">Assign from waiting list</h4>
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

      {isDirty ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-900">
            {pendingCount} selected — not yet saved
          </p>
          {pendingOrdered.map((ci) => (
            <div key={ci.assignmentId} className="flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
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

      <Input
        className="mt-3"
        placeholder="Search by name, code, or franchise..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white">
        {isWaitingLoading ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading waiting CIs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-gray-500">
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
                className={`flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 transition-colors ${
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
  );
}
