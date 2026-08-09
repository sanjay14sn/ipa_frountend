"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleField } from "@/components/shared/toggle-field";
import { Textarea } from "@/components/ui/textarea";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
  LinkPicker,
} from "@/components/shared/dialog";
import { formatRupees } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  createTrainingLevel,
  deleteTrainingLevel,
  updateTrainingLevel,
  type CreateTrainingLevelDto,
  type TrainingLevel,
  type UpdateTrainingLevelDto,
} from "@/services/training-level.service";
import { TrainingLevelMaterialsPicker } from "./TrainingLevelMaterialsPicker";
import { useLevelsByProgram } from "@/hooks/api/level.hooks";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkCiTrainingLevel } from "@/services/uniqueness.service";
import {
  invalidateTrainingLevelsForProgram,
  useTrainingLevelsForProgram,
} from "@/hooks/api/training-level.hooks";
import {
  getStudentLevelMappings,
  setStudentLevelMappings,
  type StudentLevelMapping,
} from "@/services/catalog-admin.service";

type FormState = {
  name: string;
  code: string;
  description: string;
  durationInDays: number;
  fee: number;
  theoryTotalMarks: number;
  theoryPassMark: number;
  practicalTotalMarks: number | "";
  practicalPassMark: number | "";
  practicalMarksRequired: boolean;
  displayOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  code: "",
  description: "",
  durationInDays: 1,
  fee: 0,
  theoryTotalMarks: 100,
  theoryPassMark: 40,
  practicalTotalMarks: "",
  practicalPassMark: "",
  practicalMarksRequired: false,
  displayOrder: 1,
  isActive: true,
};

const errorClass = "border-destructive focus-visible:ring-destructive";

function toFormState(level?: TrainingLevel | null): FormState {
  if (!level) return { ...emptyForm };
  return {
    name: level.name,
    code: level.code,
    description: level.description ?? "",
    durationInDays: level.durationInDays,
    fee: level.fee,
    theoryTotalMarks: level.theoryTotalMarks,
    theoryPassMark: level.theoryPassMark,
    practicalTotalMarks: level.practicalTotalMarks ?? "",
    practicalPassMark: level.practicalPassMark ?? "",
    practicalMarksRequired: level.practicalMarksRequired,
    displayOrder: level.displayOrder,
    isActive: level.isActive,
  };
}

function buildPayload(
  form: FormState,
): Omit<CreateTrainingLevelDto, "programId"> {
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim() || undefined,
    durationInDays: form.durationInDays,
    fee: form.fee,
    theoryTotalMarks: form.theoryTotalMarks,
    theoryPassMark: form.theoryPassMark,
    practicalTotalMarks:
      form.practicalTotalMarks === "" ? null : form.practicalTotalMarks,
    practicalPassMark:
      form.practicalPassMark === "" ? null : form.practicalPassMark,
    practicalMarksRequired: form.practicalMarksRequired,
    displayOrder: form.displayOrder,
    isActive: form.isActive,
  };
}

function CIStudentLevelsPicker({
  trainingLevelId,
  programId,
  disabled,
}: {
  trainingLevelId: number;
  programId: number;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: levels = [], isLoading: isLoadingLevels } = useLevelsByProgram(
    hasRequested ? programId : undefined,
  );
  const { data: streams = [], isLoading: isLoadingStreams } = useStreamsByProgram(
    hasRequested ? programId : undefined,
  );
  const mappingQueryKey = [
    "ci-training-level-student-mappings",
    trainingLevelId,
  ] as const;
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useQuery({
    queryKey: mappingQueryKey,
    queryFn: () => getStudentLevelMappings(trainingLevelId),
    enabled: hasRequested,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const assignedIds = useMemo(
    () => new Set(assigned.map((item) => item.levelId)),
    [assigned],
  );
  const streamNameById = useMemo(
    () => new Map(streams.map((stream) => [stream.id, stream.name])),
    [streams],
  );
  const available = useMemo(
    () => levels.filter((level) => !assignedIds.has(level.id)),
    [assignedIds, levels],
  );
  const filtered = search.trim()
    ? available.filter((l) => {
        const q = search.toLowerCase();
        const streamName = streamNameById.get(l.streamId) ?? "";
        return (
          l.name.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q) ||
          streamName.toLowerCase().includes(q)
        );
      })
    : available;

  function levelDisplay(levelId: number) {
    const level = levels.find((entry) => entry.id === levelId);
    if (!level) return "Unknown level";
    const streamLabel = streamNameById.get(level.streamId);
    return streamLabel ? `${level.code} (${streamLabel})` : level.code;
  }

  function togglePending(id: number) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRemove(levelId: number) {
    const nextLevelIds = assigned
      .map((item) => item.levelId)
      .filter((currentId) => currentId !== levelId);
    try {
      await setStudentLevelMappings(trainingLevelId, nextLevelIds, programId);
      await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
      await refetchAssigned();
      toast.success("Student level removed");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  async function handleSave() {
    if (pendingIds.size === 0) return;
    const count = pendingIds.size;
    const newIds = [...assigned.map((item) => item.levelId), ...pendingIds];
    setIsSaving(true);
    try {
      await setStudentLevelMappings(trainingLevelId, newIds, programId);
      await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
      await refetchAssigned();
      setPendingIds(new Set());
      setSearch("");
      toast.success(`${count} level${count !== 1 ? "s" : ""} linked`);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = isLoadingAssigned || isLoadingLevels || isLoadingStreams;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {!hasRequested ? (
        <span className="text-xs italic text-muted-foreground">Open to load</span>
      ) : isLoading ? (
        <span className="text-xs text-muted-foreground">Loading…</span>
      ) : assigned.length > 0 ? (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
        >
          <Users className="h-3 w-3 text-muted-foreground" />
          {assigned.length} mapped
        </Badge>
      ) : (
        <span className="text-xs italic text-muted-foreground">Open to load</span>
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

          <AppDialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) {
                setPendingIds(new Set());
                setSearch("");
              }
            }}
            size="xl"
            padding="flush"
            scrollBody
          >
            <AppDialogHeader
              title="Student Levels"
              description="Add and remove student levels for this CI training level."
              sticky
            />
            <AppDialogBody>
              <LinkPicker
                linked={{
                  items: assigned,
                  getKey: (item) => `${item.levelId}`,
                  getLabel: (item) =>
                    levelDisplay(item.levelId) ||
                    item.levelName ||
                    "Unknown level",
                  title: "Linked levels",
                  onUnlink: disabled
                    ? undefined
                    : (item) => void handleRemove(item.levelId),
                  emptyMessage: isLoading
                    ? "Loading…"
                    : "No linked student levels.",
                }}
                addTitle="Add student levels"
                pendingCount={pendingIds.size}
                onSave={handleSave}
                isSaving={isSaving}
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: "Search by name, code, or stream…",
                }}
                renderPending={() => (
                  <div className="space-y-1">
                    {[...pendingIds].map((id) => {
                      const level = levels.find((l) => l.id === id);
                      if (!level) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                            {levelDisplay(id)}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePending(id)}
                            aria-label={`Remove ${levelDisplay(id)} from selection`}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                list={{
                  items: filtered,
                  isLoading: isLoadingLevels || isLoadingStreams,
                  getKey: (level) => level.id,
                  isChecked: (level) => pendingIds.has(level.id),
                  onToggle: (level) => togglePending(level.id),
                  emptyMessage:
                    available.length === 0
                      ? "All program levels are already linked."
                      : "No levels match your search.",
                  renderRow: (level, checked) => {
                    const streamName = streamNameById.get(level.streamId);
                    return (
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePending(level.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-card-foreground">
                            {level.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            <span>{level.code}</span>
                            {streamName ? <span>{streamName}</span> : null}
                          </div>
                        </div>
                      </label>
                    );
                  },
                }}
              />
            </AppDialogBody>
          </AppDialog>
        </>
      ) : null}
    </div>
  );
}

export function CITrainingLevelManagement({
  programId,
  programName,
}: {
  programId: number;
  programName: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<TrainingLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<TrainingLevel | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const trainingLevelsQuery = useTrainingLevelsForProgram(programId);
  const trainingLevels = [...(trainingLevelsQuery.data ?? [])].sort((a, b) =>
    a.displayOrder === b.displayOrder
      ? a.id - b.id
      : a.displayOrder - b.displayOrder,
  );

  // Eager uniqueness checks — advisory red highlight while typing; the
  // submit path re-checks and reports field-level 409s on races.
  const codeUniq = useUniquenessCheck({
    keyParts: ["ci-training-level", "code"],
    value: form.code,
    enabled: isDialogOpen && programId > 0,
    excludeId: editingLevel?.id,
    scope: { programId },
    fetcher: (value, opts) =>
      checkCiTrainingLevel(programId, "code", value, opts),
    takenMessage: "This code already exists for this program.",
  });
  const orderUniq = useUniquenessCheck({
    keyParts: ["ci-training-level", "displayOrder"],
    value: form.displayOrder > 0 ? String(form.displayOrder) : "",
    enabled: isDialogOpen && programId > 0 && form.displayOrder > 0,
    excludeId: editingLevel?.id,
    scope: { programId },
    fetcher: (value, opts) =>
      checkCiTrainingLevel(programId, "displayOrder", String(value), opts),
    takenMessage: "This display order already exists for this program.",
  });
  const codeError = errors.code || codeUniq.error;
  const displayOrderError = errors.displayOrder || orderUniq.error;

  const openCreateDialog = () => {
    const nextOrder =
      trainingLevels.length > 0
        ? Math.max(...trainingLevels.map((level) => level.displayOrder)) + 1
        : 1;
    setEditingLevel(null);
    setForm({ ...emptyForm, displayOrder: nextOrder });
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (level: TrainingLevel) => {
    setEditingLevel(level);
    setForm(toFormState(level));
    setErrors({});
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingLevel(null);
    setForm({ ...emptyForm });
    setErrors({});
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (form.theoryTotalMarks <= 0) {
      toast.error("Theory total marks must be greater than 0");
      return;
    }
    if (
      form.theoryPassMark <= 0 ||
      form.theoryPassMark > form.theoryTotalMarks
    ) {
      toast.error("Theory pass mark must be between 1 and theory total marks");
      return;
    }
    if (!form.durationInDays || form.durationInDays <= 0) {
      toast.error("Duration must be at least 1 day");
      return;
    }
    if (form.practicalMarksRequired) {
      const ptm = form.practicalTotalMarks;
      const ppm = form.practicalPassMark;
      if (ptm === "" || ptm <= 0) {
        toast.error("Practical total marks must be greater than 0");
        return;
      }
      if (ppm === "" || ppm <= 0 || ppm > ptm) {
        toast.error(
          "Practical pass mark must be between 1 and practical total marks",
        );
        return;
      }
    }
    if (codeUniq.isTaken || orderUniq.isTaken) {
      setErrors((prev) => ({
        ...prev,
        ...(codeUniq.isTaken ? { code: codeUniq.error! } : {}),
        ...(orderUniq.isTaken ? { displayOrder: orderUniq.error! } : {}),
      }));
      return;
    }
    try {
      const payload = buildPayload(form);
      if (editingLevel) {
        await updateTrainingLevel(
          editingLevel.id,
          payload as UpdateTrainingLevelDto,
        );
      } else {
        await createTrainingLevel({ ...payload, programId });
      }
      await invalidateTrainingLevelsForProgram(programId);
      await trainingLevelsQuery.refetch();
      closeDialog();
      toast.success(editingLevel ? "CI training level updated" : "CI training level created");
    } catch (e) {
      handleFormApiError(e, {
        setErrors,
        fieldMap: { code: "code", displayOrder: "displayOrder" },
        fallback: editingLevel
          ? "Failed to update CI training level"
          : "Failed to create CI training level",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;
    try {
      await deleteTrainingLevel(deletingLevel.id);
      setDeletingLevel(null);
      setIsDeleteDialogOpen(false);
      await invalidateTrainingLevelsForProgram(programId);
      await trainingLevelsQuery.refetch();
      toast.success("CI training level deleted");
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  const formatFee = (fee: number) =>
    formatRupees(fee);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-card-foreground">
              CI training ladder
            </h3>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 font-normal text-primary"
            >
              {programName} · {trainingLevels.length} levels
            </Badge>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Program-scoped CI training levels. Theory marks are default.
            Practical marks are optional or required per level.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={openCreateDialog}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add training level
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-5">
        {trainingLevelsQuery.isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">
            Loading training ladder…
          </div>
        ) : trainingLevels.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
            No CI training levels yet. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Level</TableHead>
                  <TableHead>Theory</TableHead>
                  <TableHead>Practical</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Student Levels</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingLevels.map((level) => {
                  const hasPractical =
                    level.practicalTotalMarks != null &&
                    level.practicalPassMark != null;
                  return (
                    <TableRow key={level.id} className="align-middle">
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md bg-muted/60 px-1.5 text-[11px] font-medium text-muted-foreground">
                            #{level.displayOrder}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-card-foreground">
                              {level.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {level.code}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <Badge
                          variant="outline"
                          className="gap-1 rounded-md border-primary/20 bg-accent/40 font-normal text-card-foreground"
                        >
                          <Check className="h-3 w-3 text-primary" />
                          {level.theoryPassMark}/{level.theoryTotalMarks}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        {hasPractical ? (
                          <Badge
                            variant="outline"
                            className="gap-1 rounded-md border-primary/20 bg-accent/40 font-normal text-card-foreground"
                          >
                            <Check className="h-3 w-3 text-primary" />
                            {level.practicalPassMark}/{level.practicalTotalMarks}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-md border-border bg-muted/40 font-normal text-muted-foreground"
                          >
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle text-sm text-card-foreground">
                        {formatFee(level.fee)}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <CIStudentLevelsPicker
                          trainingLevelId={level.id}
                          programId={programId}
                          disabled={trainingLevelsQuery.isLoading}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <TrainingLevelMaterialsPicker
                          trainingLevelId={level.id}
                          disabled={trainingLevelsQuery.isLoading}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <StatusBadge
                          label={level.isActive ? "Active" : "Inactive"}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-md p-0"
                            onClick={() => openEditDialog(level)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-md p-0 text-destructive"
                            onClick={() => {
                              setDeletingLevel(level);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <FormDialog
        open={isDialogOpen}
        onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeDialog())}
        size="xl"
        title={editingLevel ? "Edit CI training level" : "Add CI training level"}
        description="Program-scoped training ladder without stream linkage."
        headerIcon={editingLevel ? Pencil : Plus}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        submitLabel={editingLevel ? "Save" : "Create"}
      >
        <DialogFormGrid cols={2}>
          <DialogFormField label="Name" required>
            <Input
              value={form.name}
              placeholder="e.g., Level 1"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </DialogFormField>
          <DialogFormField label="Code" required error={codeError}>
            <Input
              value={form.code}
              placeholder="e.g., CL1"
              className={cn(codeError && errorClass)}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, code: e.target.value }));
                if (errors.code) setErrors((prev) => ({ ...prev, code: "" }));
              }}
            />
          </DialogFormField>
        </DialogFormGrid>
        {displayOrderError ? (
          <p className="text-xs text-destructive">{displayOrderError}</p>
        ) : null}
        <DialogFormField label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Duration (days)" required>
            <Input
              type="number"
              min={1}
              value={form.durationInDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  durationInDays: Math.max(1, Number(e.target.value || 1)),
                }))
              }
            />
          </DialogFormField>
          <DialogFormField label="Fee" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.fee}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  fee: Math.max(0, Number(e.target.value || 0)),
                }))
              }
            />
          </DialogFormField>
          <DialogFormField label="Theory total marks" required>
            <Input
              type="number"
              min={0}
              value={form.theoryTotalMarks}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  theoryTotalMarks: Math.max(0, Number(e.target.value || 0)),
                }))
              }
            />
          </DialogFormField>
          <DialogFormField label="Theory pass mark" required>
            <Input
              type="number"
              min={0}
              value={form.theoryPassMark}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  theoryPassMark: Math.max(0, Number(e.target.value || 0)),
                }))
              }
            />
          </DialogFormField>
        </DialogFormGrid>

        <ToggleField
          label="Practical exam"
          value={form.practicalMarksRequired ? "required" : "not-required"}
          onValueChange={(v) =>
            setForm((prev) => {
              const required = v === "required";
              if (required) {
                return { ...prev, practicalMarksRequired: true };
              }
              // Clear practical marks when no longer required so stale values aren't submitted.
              return {
                ...prev,
                practicalMarksRequired: false,
                practicalTotalMarks: "",
                practicalPassMark: "",
              };
            })
          }
          options={[
            { value: "required", label: "Required" },
            { value: "not-required", label: "Not required" },
          ]}
        />

        {form.practicalMarksRequired ? (
          <DialogFormGrid cols={2}>
            <DialogFormField label="Practical total marks" required>
              <Input
                type="number"
                min={0}
                value={form.practicalTotalMarks}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalTotalMarks:
                      e.target.value === ""
                        ? ""
                        : Math.max(0, Number(e.target.value)),
                  }))
                }
              />
            </DialogFormField>
            <DialogFormField label="Practical pass mark" required>
              <Input
                type="number"
                min={0}
                value={form.practicalPassMark}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalPassMark:
                      e.target.value === ""
                        ? ""
                        : Math.max(0, Number(e.target.value)),
                  }))
                }
              />
            </DialogFormField>
          </DialogFormGrid>
        ) : null}

        <ToggleField
          label="Status"
          value={form.isActive ? "active" : "inactive"}
          onValueChange={(v) =>
            setForm((prev) => ({ ...prev, isActive: v === "active" }))
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        variant="destructive"
        title="Delete CI training level?"
        description={`Remove "${deletingLevel?.name}" and its inventory links.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
