"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, GitBranch, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getStreamsByProgram,
  createStream,
  updateStream,
  deleteStream,
  type Stream,
  type CreateStreamDto,
  type UpdateStreamDto,
} from "@/services/stream.service";
import {
  getTransitionsByProgram,
  createStreamTransition,
  updateStreamTransition,
  deleteStreamTransition,
  type StreamTransition,
} from "@/services/stream-transition.service";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
} from "@/components/shared/dialog";
import { invalidateStreamsByProgram } from "@/hooks/api/stream.hooks";
import { invalidateStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";

interface StreamManagementProps {
  programId: number;
  programName: string;
  /** Narrow sidebar layout when nested under program ladder */
  compact?: boolean;
  initialStreams?: Stream[];
  initialTransitions?: StreamTransition[];
  skipInitialLoad?: boolean;
  /** Bump parent state so level ladder refetches streams/transitions */
  onCatalogChange?: () => void;
}

export function StreamManagement({
  programId,
  programName,
  compact,
  initialStreams,
  initialTransitions,
  skipInitialLoad,
  onCatalogChange,
}: StreamManagementProps) {
  const [streams, setStreams] = useState<Stream[]>(initialStreams ?? []);
  const [transitions, setTransitions] = useState<StreamTransition[]>(
    initialTransitions ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    skipInitialLoad ? false : !(initialStreams && initialTransitions),
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [deletingStream, setDeletingStream] = useState<Stream | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    hasStartingKit: true,
    minAge: "" as string,
    maxAge: "" as string,
    displayOrder: "" as string,
  });
  const [editFormData, setEditFormData] = useState<UpdateStreamDto>({});

  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [editingTransition, setEditingTransition] =
    useState<StreamTransition | null>(null);
  const [transitionForm, setTransitionForm] = useState({
    fromStreamId: "",
    toStreamId: "",
    toLevelDisplayOrder: "1",
  });
  const [deletingTransition, setDeletingTransition] =
    useState<StreamTransition | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, t] = await Promise.all([
        getStreamsByProgram(programId),
        getTransitionsByProgram(programId),
      ]);
      setStreams(s);
      setTransitions(t);
    } catch {
      toast.error("Failed to load streams or transitions");
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    if (skipInitialLoad) return;
    void loadAll();
  }, [loadAll, skipInitialLoad]);

  useEffect(() => {
    if (!skipInitialLoad) return;
    setStreams(initialStreams ?? []);
    setTransitions(initialTransitions ?? []);
    setIsLoading(false);
  }, [initialStreams, initialTransitions, skipInitialLoad]);

  const notifyParent = () => {
    onCatalogChange?.();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      isActive: true,
      hasStartingKit: true,
      minAge: "",
      maxAge: "",
      displayOrder: "",
    });
  };

  const parseOptInt = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleAddStream = async () => {
    if (!formData.name.trim()) {
      toast.error("Stream name is required");
      return;
    }
    const payload: CreateStreamDto = {
      name: formData.name.trim(),
      programId,
      isActive: formData.isActive,
      hasStartingKit: formData.hasStartingKit,
      minAge: parseOptInt(formData.minAge),
      maxAge: parseOptInt(formData.maxAge),
      displayOrder: Number(formData.displayOrder) || 0,
    };
    try {
      await createStream(payload);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream created");
      resetForm();
      setIsAddDialogOpen(false);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to create stream");
    }
  };

  const handleEditStream = async () => {
    if (!editingStream) return;
    try {
      await updateStream(editingStream.id, editFormData);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream updated");
      setIsEditDialogOpen(false);
      setEditingStream(null);
      setEditFormData({});
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to update stream");
    }
  };

  const handleDeleteStream = async () => {
    if (!deletingStream) return;
    try {
      await deleteStream(deletingStream.id);
      await invalidateStreamsByProgram(programId);
      toast.success("Stream deleted");
      setIsDeleteDialogOpen(false);
      setDeletingStream(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to delete stream. Remove levels first, or check permissions.");
    }
  };

  const openAddTransition = () => {
    setEditingTransition(null);
    setTransitionForm({
      fromStreamId: streams[0]?.id?.toString() ?? "",
      toStreamId: streams[1]?.id?.toString() ?? streams[0]?.id?.toString() ?? "",
      toLevelDisplayOrder: "1",
    });
    setIsTransitionDialogOpen(true);
  };

  const openEditTransition = (t: StreamTransition) => {
    setEditingTransition(t);
    setTransitionForm({
      fromStreamId: String(t.fromStreamId),
      toStreamId: String(t.toStreamId),
      toLevelDisplayOrder: String(t.toLevelDisplayOrder),
    });
    setIsTransitionDialogOpen(true);
  };

  const saveTransition = async () => {
    const fromId = Number(transitionForm.fromStreamId);
    const toId = Number(transitionForm.toStreamId);
    const ord = Number(transitionForm.toLevelDisplayOrder);
    if (!fromId || !toId || !Number.isFinite(ord) || ord < 1) {
      toast.error("Select streams and a valid target level order");
      return;
    }
    try {
      if (editingTransition) {
        await updateStreamTransition(editingTransition.id, {
          fromStreamId: fromId,
          toStreamId: toId,
          toLevelDisplayOrder: ord,
          programId,
        });
        await invalidateStreamTransitionsByProgram(programId);
        toast.success("Transition updated");
      } else {
        await createStreamTransition({
          programId,
          fromStreamId: fromId,
          toStreamId: toId,
          toLevelDisplayOrder: ord,
        });
        await invalidateStreamTransitionsByProgram(programId);
        toast.success("Transition added");
      }
      setIsTransitionDialogOpen(false);
      setEditingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to save transition (check target level exists)");
    }
  };

  const handleDeleteTransition = async () => {
    if (!deletingTransition) return;
    try {
      await deleteStreamTransition(deletingTransition.id);
      await invalidateStreamTransitionsByProgram(programId);
      toast.success("Transition removed");
      setDeletingTransition(null);
      await loadAll();
      notifyParent();
    } catch {
      toast.error("Failed to delete transition");
    }
  };

  const streamName = (id: number) =>
    streams.find((s) => s.id === id)?.name ?? `#${id}`;

  const formatAgeRange = (
    minAge?: number | null,
    maxAge?: number | null,
  ): string => {
    if (minAge == null && maxAge == null) return "Ages: any";
    if (minAge != null && maxAge != null) return `Ages ${minAge}–${maxAge}`;
    if (minAge != null) return `Ages ${minAge}+`;
    return `Ages up to ${maxAge}`;
  };

  const sortedStreams = [...streams].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-card-foreground">
            Streams &amp; transitions
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage stream ages and completion transitions for {programName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            disabled={isLoading}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add stream
          </Button>
          <Button
            size="sm"
            onClick={openAddTransition}
            disabled={isLoading || streams.length < 1}
          >
            <GitBranch className="mr-1 h-4 w-4" />
            New transition
          </Button>
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Loading streams…
            </div>
          ) : sortedStreams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No streams yet. Add one to start mapping levels.
            </div>
          ) : (
            sortedStreams.map((stream, index) => {
              const levelCount = stream.levelCount ?? 0;
              return (
                <div
                  key={stream.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/30"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 min-w-[26px] items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-medium text-card-foreground">
                        <span className="truncate">{stream.name}</span>
                        {stream.hasStartingKit ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary"
                          >
                            Starting kit
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatAgeRange(stream.minAge, stream.maxAge)}
                        {" · "}
                        {levelCount} {levelCount === 1 ? "level" : "levels"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                      onClick={() => {
                        setEditingStream(stream);
                        setEditFormData({
                          name: stream.name,
                          isActive: stream.isActive ?? true,
                          hasStartingKit: stream.hasStartingKit ?? true,
                          minAge: stream.minAge ?? null,
                          maxAge: stream.maxAge ?? null,
                          displayOrder: stream.displayOrder ?? 0,
                          programId,
                        });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeletingStream(stream);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Completion transitions
            </h4>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-[10px] font-medium text-primary"
            >
              {transitions.length} active
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            {transitions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
                No transitions yet. Map how students continue across streams.
              </div>
            ) : (
              transitions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/50 text-xs font-normal text-card-foreground"
                    >
                      {streamName(t.fromStreamId)}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/50 text-xs font-normal text-card-foreground"
                    >
                      {streamName(t.toStreamId)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      @ order {t.toLevelDisplayOrder}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                      onClick={() => openEditTransition(t)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingTransition(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openAddTransition}
              disabled={isLoading || streams.length < 1}
              className="mt-1 w-full justify-center border-dashed text-muted-foreground hover:text-primary"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add transition
            </Button>
          </div>
        </section>
      </div>

      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        size="md"
        title="Add stream"
        description={`For ${programName}`}
        headerIcon={Plus}
        onSubmit={(e) => {
          e.preventDefault();
          handleAddStream();
        }}
        submitLabel="Create"
      >
        <DialogFormField label="Name" required>
          <Input
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="e.g. Elementary"
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Min age">
            <Input
              value={formData.minAge}
              onChange={(e) =>
                setFormData({ ...formData, minAge: e.target.value })
              }
              placeholder="optional"
            />
          </DialogFormField>
          <DialogFormField label="Max age">
            <Input
              value={formData.maxAge}
              onChange={(e) =>
                setFormData({ ...formData, maxAge: e.target.value })
              }
              placeholder="optional"
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormField label="Display order">
          <Input
            type="number"
            min={0}
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({ ...formData, displayOrder: e.target.value })
            }
            onFocus={selectInputValueOnFocus}
            placeholder="0"
          />
        </DialogFormField>
        <ToggleField
          label="Status"
          value={formData.isActive ? "active" : "inactive"}
          onValueChange={(v) =>
            setFormData({ ...formData, isActive: v === "active" })
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <ToggleField
          label="Starting kit"
          value={formData.hasStartingKit ? "yes" : "no"}
          onValueChange={(v) =>
            setFormData({ ...formData, hasStartingKit: v === "yes" })
          }
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        size="md"
        title="Edit stream"
        headerIcon={Edit2}
        onSubmit={(e) => {
          e.preventDefault();
          handleEditStream();
        }}
        submitLabel="Save"
      >
        <DialogFormField label="Name">
          <Input
            value={editFormData.name ?? ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, name: e.target.value })
            }
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Min age">
            <Input
              value={
                editFormData.minAge === null ||
                editFormData.minAge === undefined
                  ? ""
                  : String(editFormData.minAge)
              }
              onChange={(e) => {
                const v = e.target.value;
                setEditFormData({
                  ...editFormData,
                  minAge: v === "" ? null : Number(v),
                });
              }}
            />
          </DialogFormField>
          <DialogFormField label="Max age">
            <Input
              value={
                editFormData.maxAge === null ||
                editFormData.maxAge === undefined
                  ? ""
                  : String(editFormData.maxAge)
              }
              onChange={(e) => {
                const v = e.target.value;
                setEditFormData({
                  ...editFormData,
                  maxAge: v === "" ? null : Number(v),
                });
              }}
            />
          </DialogFormField>
        </DialogFormGrid>
        <DialogFormField label="Display order">
          <Input
            type="number"
            value={
              editFormData.displayOrder === undefined ||
              editFormData.displayOrder === null
                ? ""
                : String(editFormData.displayOrder)
            }
            onChange={(e) => {
              const v = e.target.value;
              setEditFormData({
                ...editFormData,
                displayOrder: v === "" ? undefined : Number(v),
              });
            }}
            onFocus={selectInputValueOnFocus}
          />
        </DialogFormField>
        <ToggleField
          label="Status"
          value={(editFormData.isActive ?? true) ? "active" : "inactive"}
          onValueChange={(v) =>
            setEditFormData({ ...editFormData, isActive: v === "active" })
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <ToggleField
          label="Starting kit"
          value={(editFormData.hasStartingKit ?? true) ? "yes" : "no"}
          onValueChange={(v) =>
            setEditFormData({ ...editFormData, hasStartingKit: v === "yes" })
          }
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        variant="destructive"
        title="Delete stream?"
        description={`Remove "${deletingStream?.name}" (no levels must remain).`}
        confirmLabel="Delete"
        onConfirm={handleDeleteStream}
      />

      <FormDialog
        open={isTransitionDialogOpen}
        onOpenChange={setIsTransitionDialogOpen}
        size="md"
        title={editingTransition ? "Edit transition" : "Add transition"}
        description="After a student finishes all levels in the source stream, they continue in the target stream at the given level order."
        headerIcon={GitBranch}
        onSubmit={(e) => {
          e.preventDefault();
          saveTransition();
        }}
        submitLabel="Save"
      >
        <DialogFormField label="From stream">
          <Select
            value={transitionForm.fromStreamId}
            onValueChange={(v) =>
              setTransitionForm({ ...transitionForm, fromStreamId: v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {streams.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogFormField>
        <DialogFormField label="To stream">
          <Select
            value={transitionForm.toStreamId}
            onValueChange={(v) =>
              setTransitionForm({ ...transitionForm, toStreamId: v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              {streams.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogFormField>
        <DialogFormField label="Target display order (in target stream)">
          <Input
            type="number"
            min={1}
            value={transitionForm.toLevelDisplayOrder}
            onChange={(e) =>
              setTransitionForm({
                ...transitionForm,
                toLevelDisplayOrder: e.target.value,
              })
            }
            onFocus={selectInputValueOnFocus}
          />
        </DialogFormField>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingTransition}
        onOpenChange={(o) => !o && setDeletingTransition(null)}
        variant="destructive"
        title="Remove transition?"
        description="This only removes the mapping; levels are unchanged."
        confirmLabel="Remove"
        onConfirm={handleDeleteTransition}
      />
    </div>
  );
}
