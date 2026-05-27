"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/shared/toggle-field";
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
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  type DataTableColumn,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import {
  createTrainingLevel,
  deleteTrainingLevel,
  getTrainingLevelsByProgram,
  updateTrainingLevel,
  type CreateTrainingLevelDto,
  type TrainingLevel,
  type UpdateTrainingLevelDto,
} from "@/services/training-level.service";
import { getAllPrograms, type Program } from "@/services/program.service";
import { TrainingLevelMaterialsPicker } from "./TrainingLevelMaterialsPicker";
import { TrainingLevelStudentLevelsPicker } from "./TrainingLevelStudentLevelsPicker";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";

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

export function TrainingLevelsSection() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<TrainingLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<TrainingLevel | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  useEffect(() => {
    const loadPrograms = async () => {
      setIsLoadingPrograms(true);
      try {
        const programRows = await getAllPrograms();
        setPrograms(programRows);
        setSelectedProgramId((current) => current ?? programRows[0]?.id ?? null);
      } catch (e) {
        toast.error(getUserFriendlyMessage(e));
      } finally {
        setIsLoadingPrograms(false);
      }
    };
    void loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId == null) {
      setTrainingLevels([]);
      return;
    }

    const loadTrainingLevels = async () => {
      setIsLoadingLevels(true);
      try {
        const rows = await getTrainingLevelsByProgram(selectedProgramId);
        setTrainingLevels(
          [...rows].sort((a, b) =>
            a.displayOrder === b.displayOrder
              ? a.id - b.id
              : a.displayOrder - b.displayOrder,
          ),
        );
      } catch (e) {
        toast.error(getUserFriendlyMessage(e));
      } finally {
        setIsLoadingLevels(false);
      }
    };
    void loadTrainingLevels();
  }, [selectedProgramId]);

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

  const refreshLevels = async () => {
    if (selectedProgramId == null) return;
    const rows = await getTrainingLevelsByProgram(selectedProgramId);
    setTrainingLevels(
      [...rows].sort((a, b) =>
        a.displayOrder === b.displayOrder ? a.id - b.id : a.displayOrder - b.displayOrder,
      ),
    );
  };

  const handleSubmit = async () => {
    if (selectedProgramId == null) {
      toast.error("Select a program first");
      return;
    }
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
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
        await createTrainingLevel({
          ...payload,
          programId: selectedProgramId,
        });
      }
      await refreshLevels();
      closeDialog();
      toast.success(editingLevel ? "Training level updated" : "Training level created");
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;
    try {
      await deleteTrainingLevel(deletingLevel.id);
      setIsDeleteDialogOpen(false);
      setDeletingLevel(null);
      await refreshLevels();
      toast.success("Training level deleted");
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  const columns: DataTableColumn<TrainingLevel>[] = [
    {
      key: "level",
      header: "Level",
    },
    {
      key: "fee",
      header: "Fee",
      className: "text-right",
      render: (level) =>
        level.fee.toLocaleString("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (level) => (
        <Badge variant={level.isActive ? "default" : "secondary"}>
          {level.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] text-center",
      render: (level) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit level"
            aria-label="Edit level"
            onClick={() => openEditDialog(level)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Delete level"
            aria-label="Delete level"
            onClick={() => {
              setDeletingLevel(level);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Label htmlFor="training-program">Program</Label>
          <Select
            value={selectedProgramId?.toString()}
            onValueChange={(value) => setSelectedProgramId(Number(value))}
          >
            <SelectTrigger id="training-program" className="w-[280px]">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.id} value={String(program.id)}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={openCreateDialog}
          disabled={selectedProgramId == null || isLoadingPrograms}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Training Level
        </Button>
      </div>

      <DataTable
        data={trainingLevels}
        loading={isLoadingPrograms || isLoadingLevels}
        columns={columns}
        getRowId={(level) => String(level.id)}
        renderMainCell={(level) => (
          <span className="inline-flex items-center gap-2 font-medium">
            <Badge variant="outline" className="font-mono">
              #{level.displayOrder}
            </Badge>
            {level.name}
            <span className="text-xs text-muted-foreground">· {level.code}</span>
          </span>
        )}
        renderExpandedContent={(level) => (
          <ExpandedDetailSurface>
            <ExpandedDetailSection title="Training details">
              <DetailFieldsGrid columns={3}>
                <DetailField
                  label="Duration"
                  value={`${level.durationInDays} day(s)`}
                />
                <DetailField
                  label="Theory"
                  value={`${level.theoryPassMark}/${level.theoryTotalMarks}`}
                />
                <DetailField
                  label="Practical"
                  value={
                    level.practicalTotalMarks != null &&
                    level.practicalPassMark != null
                      ? `${level.practicalPassMark}/${level.practicalTotalMarks} (${level.practicalMarksRequired ? "Required" : "Situational"})`
                      : "None"
                  }
                />
                {level.description ? (
                  <DetailField
                    label="Description"
                    value={level.description}
                    span={3}
                  />
                ) : null}
              </DetailFieldsGrid>
            </ExpandedDetailSection>

            <Separator />

            <ExpandedDetailSection title="Assigned student levels">
              <TrainingLevelStudentLevelsPicker
                trainingLevelId={level.id}
                programId={level.programId}
                disabled={isLoadingLevels}
              />
            </ExpandedDetailSection>

            <Separator />

            <ExpandedDetailSection title="Materials">
              <TrainingLevelMaterialsPicker
                trainingLevelId={level.id}
                disabled={isLoadingLevels}
              />
            </ExpandedDetailSection>
          </ExpandedDetailSurface>
        )}
        emptyMessage={
          selectedProgramId == null
            ? "No program available."
            : "No training levels found for this program."
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Edit Training Level" : "Add Training Level"}
            </DialogTitle>
            <DialogDescription>
              Program-scoped CI training level with theory marks by default and
              optional practical marks.
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-4">
              <ToggleField
                label="Practical exam"
                value={form.practicalMarksRequired ? "required" : "not-required"}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalMarksRequired: v === "required",
                  }))
                }
                options={[
                  { value: "required", label: "Required" },
                  { value: "not-required", label: "Not required" },
                ]}
              />
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
            <AlertDialogTitle>Delete training level?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deletingLevel?.name}&quot; and its inventory links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
