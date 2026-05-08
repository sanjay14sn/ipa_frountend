"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  RawTableSurface,
  TableEmptyState,
  TableLoadingState,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTrainingLevel,
  deleteTrainingLevel,
  updateTrainingLevel,
  type CreateTrainingLevelDto,
  type TrainingLevel,
  type UpdateTrainingLevelDto,
} from "@/services/training-level.service";
import { TrainingLevelMaterialsPicker } from "@/app/admin/training-levels/TrainingLevelMaterialsPicker";
import { useLevelsByProgram } from "@/hooks/api/level.hooks";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<number | "">("");
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
  const available = useMemo(
    () => levels.filter((level) => !assignedIds.has(level.id)),
    [assignedIds, levels],
  );
  const streamNameById = useMemo(
    () => new Map(streams.map((stream) => [stream.id, stream.name])),
    [streams],
  );

  function levelDisplay(levelId: number) {
    const level = levels.find((entry) => entry.id === levelId);
    if (!level) return `L${levelId}`;
    const streamLabel = streamNameById.get(level.streamId) ?? `stream ${level.streamId}`;
    return `${level.code} (${streamLabel})`;
  }

  async function updateMappings(levelIds: number[], successTitle: string) {
    try {
      await setStudentLevelMappings(trainingLevelId, levelIds, programId);
      await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
      await refetchAssigned();
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    }
  }

  async function handleAdd(levelId: number) {
    const nextLevelIds = [...assigned.map((item) => item.levelId), levelId];
    await updateMappings(nextLevelIds, "Student level linked");
  }

  async function handleRemove(levelId: number) {
    const nextLevelIds = assigned
      .map((item) => item.levelId)
      .filter((currentId) => currentId !== levelId);
    await updateMappings(nextLevelIds, "Student level removed");
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingLevels || isLoadingStreams ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {assigned.length} linked
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

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Student Levels</DialogTitle>
                <DialogDescription>
                  Add and remove student levels for this CI training level.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Linked levels</div>
                  {isLoadingAssigned || isLoadingLevels || isLoadingStreams ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked student levels.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((item, index) => (
                        <Badge
                          key={`${item.levelId}-${index}`}
                          variant="secondary"
                          className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1 font-normal"
                        >
                          <span className="max-w-[220px] truncate">
                            {levelDisplay(item.levelId) || item.levelName || `L${item.levelId}`}
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded-sm px-1 text-gray-500 hover:bg-muted hover:text-destructive disabled:opacity-50"
                            aria-label={`Remove ${levelDisplay(item.levelId) || item.levelName || `L${item.levelId}`}`}
                            onClick={() => void handleRemove(item.levelId)}
                          >
                            x
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
                  <Select
                    value={selectedLevelId === "" ? "none" : String(selectedLevelId)}
                    onValueChange={(value) =>
                      setSelectedLevelId(value === "none" ? "" : Number(value))
                    }
                    disabled={isLoadingLevels || isLoadingStreams || isLoadingAssigned}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select student level</SelectItem>
                      {available.map((level) => (
                        <SelectItem key={level.id} value={String(level.id)}>
                          {level.code} ({streamNameById.get(level.streamId) ?? `stream ${level.streamId}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    disabled={selectedLevelId === ""}
                    onClick={() => {
                      if (selectedLevelId !== "") {
                        void handleAdd(selectedLevelId);
                        setSelectedLevelId("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<TrainingLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<TrainingLevel | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const trainingLevelsQuery = useTrainingLevelsForProgram(programId);
  const trainingLevels = [...(trainingLevelsQuery.data ?? [])].sort((a, b) =>
    a.displayOrder === b.displayOrder
      ? a.id - b.id
      : a.displayOrder - b.displayOrder,
  );

  const openCreateDialog = () => {
    const nextOrder =
      trainingLevels.length > 0
        ? Math.max(...trainingLevels.map((level) => level.displayOrder)) + 1
        : 1;
    setEditingLevel(null);
    setForm({ ...emptyForm, displayOrder: nextOrder });
    setIsDialogOpen(true);
  };

  const openEditDialog = (level: TrainingLevel) => {
    setEditingLevel(level);
    setForm(toFormState(level));
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingLevel(null);
    setForm({ ...emptyForm });
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({
        title: "Error",
        description: "Name and code are required",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: editingLevel
          ? "CI training level updated"
          : "CI training level created",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
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
      toast({ title: "Success", description: "CI training level deleted" });
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            CI training ladder - {programName}
          </h3>
          <Badge variant="secondary">{trainingLevels.length} levels</Badge>
        </div>
        <Button type="button" size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add training level
        </Button>
      </div>
      <p className="text-xs text-gray-600">
        Program-scoped CI training levels. Theory marks are default. Practical
        marks are optional or required per level.
      </p>

      {trainingLevelsQuery.isLoading ? (
        <TableLoadingState message="Loading CI training levels..." />
      ) : trainingLevels.length === 0 ? (
        <TableEmptyState message="No CI training levels found for this program." />
      ) : (
        <RawTableSurface>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Duration</TableHead>
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
              {trainingLevels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.displayOrder}</TableCell>
                  <TableCell>
                    <div className="font-medium">{level.name}</div>
                    <div className="text-xs text-muted-foreground">{level.code}</div>
                  </TableCell>
                  <TableCell>{level.durationInDays} day(s)</TableCell>
                  <TableCell>
                    {level.theoryPassMark}/{level.theoryTotalMarks}
                  </TableCell>
                  <TableCell>
                    {level.practicalTotalMarks != null &&
                    level.practicalPassMark != null ? (
                      <div className="space-y-1">
                        <div>
                          {level.practicalPassMark}/{level.practicalTotalMarks}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {level.practicalMarksRequired ? "Required" : "Situational"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {level.fee.toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <CIStudentLevelsPicker
                      trainingLevelId={level.id}
                      programId={programId}
                      disabled={trainingLevelsQuery.isLoading}
                    />
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <TrainingLevelMaterialsPicker
                      trainingLevelId={level.id}
                      disabled={trainingLevelsQuery.isLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={level.isActive ? "default" : "secondary"}>
                      {level.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(level)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingLevel(level);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RawTableSurface>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Edit CI training level" : "Add CI training level"}
            </DialogTitle>
            <DialogDescription>
              Program-scoped training ladder without stream linkage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Fee</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Theory total marks</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Theory pass mark</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Practical total marks</Label>
              <Input
                type="number"
                min={0}
                value={form.practicalTotalMarks}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalTotalMarks:
                      e.target.value === "" ? "" : Math.max(0, Number(e.target.value)),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Practical pass mark</Label>
              <Input
                type="number"
                min={0}
                value={form.practicalPassMark}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalPassMark:
                      e.target.value === "" ? "" : Math.max(0, Number(e.target.value)),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                min={1}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    displayOrder: Math.max(1, Number(e.target.value || 1)),
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-6 pt-8">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.practicalMarksRequired}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      practicalMarksRequired: checked,
                    }))
                  }
                />
                <Label>Practical required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingLevel ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CI training level?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deletingLevel?.name}&quot; and its inventory links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
