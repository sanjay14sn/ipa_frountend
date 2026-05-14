"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CATALOG_PENDING_SPLIT_ROW_HEIGHT } from "@/lib/catalog-line-split-layout";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import {
  getStudentLevelsForTrainingLevel,
  setStudentLevelsForTrainingLevel,
} from "@/services/training-level.service";
import { getLevelsByProgram } from "@/services/level.service";

export function TrainingLevelStudentLevelsPicker({
  trainingLevelId,
  programId,
  disabled,
}: {
  trainingLevelId: number;
  programId: number;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: linked = [], isLoading: isLoadingLinked, refetch } = useQuery({
    queryKey: ["training-levels", "student-levels", trainingLevelId],
    queryFn: () => getStudentLevelsForTrainingLevel(trainingLevelId),
    enabled: hasRequested,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });

  const { data: catalog = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["levels", "program", programId],
    queryFn: () => getLevelsByProgram(programId),
    enabled: hasRequested,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.id)), [linked]);

  const available = useMemo(
    () => catalog.filter((l) => !linkedIds.has(l.id)),
    [catalog, linkedIds],
  );

  const filtered = search.trim()
    ? available.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q)
        );
      })
    : available;

  function togglePending(id: number) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRemoveLinked(levelId: number) {
    const remaining = linked.filter((l) => l.id !== levelId).map((l) => l.id);
    try {
      await setStudentLevelsForTrainingLevel(trainingLevelId, remaining, programId);
      await refetch();
      toast({ title: "Level unlinked" });
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  }

  async function handleSave() {
    if (pendingIds.size === 0) return;
    const newIds = [...linked.map((l) => l.id), ...pendingIds];
    setIsSaving(true);
    try {
      await setStudentLevelsForTrainingLevel(trainingLevelId, newIds, programId);
      await refetch();
      setPendingIds(new Set());
      setSearch("");
      toast({
        title: `${pendingIds.size} level${pendingIds.size !== 1 ? "s" : ""} linked`,
      });
    } catch (e) {
      toast({
        title: "Failed to save",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingLinked ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {linked.length} linked
        </span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Manage student levels"
            aria-label="Manage student levels"
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) {
                setPendingIds(new Set());
                setSearch("");
              }
            }}
          >
            <DialogContent className="flex max-h-[90vh] flex-col gap-2 overflow-hidden sm:max-w-[560px]">
              <DialogHeader className="shrink-0">
                <DialogTitle>Student Levels</DialogTitle>
                <DialogDescription>
                  Link basic student levels to this CI training level.
                </DialogDescription>
              </DialogHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                {/* Section 1: Already linked */}
                <div className="shrink-0 rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Linked levels</div>
                  {isLoadingLinked ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : linked.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No linked levels.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {linked.map((level) => (
                        <Badge
                          key={level.id}
                          variant="secondary"
                          className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1 font-normal"
                        >
                          <span className="max-w-[200px] truncate">
                            {level.name}
                          </span>
                          <button
                            type="button"
                            className="rounded-sm px-1 text-gray-500 hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${level.name}`}
                            onClick={() => void handleRemoveLinked(level.id)}
                          >
                            x
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sections 2 + 3: pending selections + searchable catalog */}
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 rounded-lg border border-dashed bg-slate-50/60 px-2 py-1.5 sm:px-2 sm:py-2">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
                    <h4 className="text-xs font-medium leading-tight text-gray-900 sm:text-sm">
                      Link student levels
                    </h4>
                    {pendingIds.size > 0 ? (
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
                        Save Changes ({pendingIds.size})
                      </Button>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "mt-1 flex min-h-0 flex-col",
                      pendingIds.size > 0 ? "grid grid-cols-1 gap-2" : "gap-2",
                    )}
                    style={
                      pendingIds.size > 0
                        ? {
                            gridTemplateRows: `${CATALOG_PENDING_SPLIT_ROW_HEIGHT} ${CATALOG_PENDING_SPLIT_ROW_HEIGHT}`,
                          }
                        : { minHeight: "min(48vh, 420px)" }
                    }
                  >
                    {pendingIds.size > 0 ? (
                      <div className="h-full min-h-0 space-y-1 overflow-y-auto rounded-md border border-emerald-200 bg-emerald-50/40 px-1 py-0.5 sm:px-1.5 sm:py-1">
                        <p className="shrink-0 text-[11px] font-medium leading-tight text-emerald-900 sm:text-xs">
                          {pendingIds.size} selected — not yet saved
                        </p>
                        {[...pendingIds].map((id) => {
                          const level = catalog.find((l) => l.id === id);
                          if (!level) return null;
                          return (
                            <div
                              key={id}
                              className="flex w-full flex-row flex-wrap items-center justify-between gap-2 py-0.5"
                            >
                              <div className="min-w-0 max-w-[50%] shrink-0 sm:max-w-[45%]">
                                <div className="truncate text-sm font-medium text-gray-900">
                                  {level.name}
                                </div>
                                <div className="text-xs text-gray-500">{level.code}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePending(id)}
                                aria-label={`Remove ${level.name} from selection`}
                                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm",
                        pendingIds.size > 0 ? "h-full min-h-0" : "min-h-0 flex-1",
                      )}
                    >
                      <div className="shrink-0 border-b border-border/80 bg-muted/25 px-1.5 py-0.5 sm:px-2 sm:py-1">
                        <Input
                          className="h-8 border-input/80 bg-background text-sm shadow-none"
                          placeholder="Search by name or code..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                        {isLoadingCatalog ? (
                          <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading levels...
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                            {available.length === 0
                              ? "All program levels are already linked."
                              : "No levels match your search."}
                          </div>
                        ) : (
                          filtered.map((level) => {
                            const checked = pendingIds.has(level.id);
                            return (
                              <div
                                key={level.id}
                                className={`flex items-center gap-1.5 border-b px-1.5 py-1 last:border-b-0 transition-colors sm:gap-2 sm:px-2 ${
                                  checked ? "bg-emerald-50/60" : "hover:bg-gray-50"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => togglePending(level.id)}
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                    checked
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-gray-300 bg-white text-transparent"
                                  }`}
                                  aria-label={
                                    checked
                                      ? `Uncheck ${level.name}`
                                      : `Check ${level.name}`
                                  }
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-gray-900">
                                    {level.name}
                                  </div>
                                  <div className="text-xs text-gray-500">{level.code}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
