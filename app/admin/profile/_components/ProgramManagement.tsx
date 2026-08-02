"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  type Program,
} from "@/services/program.service";
import { usePrograms, invalidatePrograms } from "@/hooks/api/program.hooks";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkProgramName } from "@/services/uniqueness.service";
import { handleFormApiError } from "@/lib/form-errors";
import {
  AddProgramDialog,
  EditProgramDialog,
  DeleteProgramDialog,
} from "./ProgramFormDialog";
import {
  ProgramList,
  type ProgramTabMode,
} from "./ProgramList";

export function ProgramManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramCode, setNewProgramCode] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalogTick, setCatalogTick] = useState(0);
  const [kitCounts, setKitCounts] = useState<Record<number, number>>({});
  const [openLevelModes, setOpenLevelModes] = useState<
    Record<number, ProgramTabMode>
  >({});
  const [activeProgramId, setActiveProgramId] = useState<string>("");

  const { programs, isLoading } = usePrograms();

  // Eager uniqueness checks — advisory red highlight while typing; the
  // submit path re-checks and reports field-level 409s on races.
  const addNameUniq = useUniquenessCheck({
    keyParts: ["program", "name"],
    value: newProgramName,
    enabled: isAddDialogOpen,
    fetcher: (value, opts) => checkProgramName(value, opts),
    takenMessage: "A program with this name already exists.",
  });
  const editNameUniq = useUniquenessCheck({
    keyParts: ["program", "name"],
    value: editProgramName,
    enabled: isEditDialogOpen && editingProgram != null,
    excludeId: editingProgram?.id,
    fetcher: (value, opts) => checkProgramName(value, opts),
    takenMessage: "A program with this name already exists.",
  });

  useEffect(() => {
    setOpenLevelModes((prev) =>
      Object.fromEntries(
        programs.map((program) => [program.id, prev[program.id] ?? "basic"]),
      ),
    );
    if (programs.length === 0) {
      if (activeProgramId !== "") setActiveProgramId("");
      return;
    }
    const stillExists = programs.some(
      (p) => String(p.id) === activeProgramId,
    );
    if (!stillExists) {
      setActiveProgramId(String(programs[0].id));
    }
  }, [programs, activeProgramId]);

  // ── CRUD handlers ───────────────────────────────────────────────────────

  const handleAddProgram = async () => {
    if (!newProgramName.trim()) {
      toast.error("Program name cannot be empty");
      return;
    }
    if (addNameUniq.isTaken) {
      setErrors((prev) => ({ ...prev, name: addNameUniq.error! }));
      return;
    }
    try {
      await createProgram({
        name: newProgramName.trim(),
        code: newProgramCode.trim() || null,
      });
      toast.success("Program created successfully");
      setNewProgramName("");
      setNewProgramCode("");
      setIsAddDialogOpen(false);
      void invalidatePrograms();
    } catch (error) {
      handleFormApiError(error, {
        setErrors,
        fieldMap: { name: "name" },
        fallback: "Failed to create program",
      });
    }
  };

  const handleEditProgram = async () => {
    if (!editingProgram || !editProgramName.trim()) {
      toast.error("Program name cannot be empty");
      return;
    }
    if (editNameUniq.isTaken) {
      setErrors((prev) => ({ ...prev, name: editNameUniq.error! }));
      return;
    }
    try {
      await updateProgram(editingProgram.id, editProgramName.trim());
      toast.success("Program updated successfully");
      setIsEditDialogOpen(false);
      setEditingProgram(null);
      setEditProgramName("");
      void invalidatePrograms();
    } catch (error) {
      handleFormApiError(error, {
        setErrors,
        fieldMap: { name: "name" },
        fallback: "Failed to update program",
      });
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    try {
      await deleteProgram(deletingProgram.id);
      toast.success("Program deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingProgram(null);
      void invalidatePrograms();
    } catch {
      toast.error("Failed to delete program. It may have associated levels.");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <ProgramList
        programs={programs}
        isLoading={isLoading}
        activeProgramId={activeProgramId}
        onActiveProgramIdChange={setActiveProgramId}
        openLevelModes={openLevelModes}
        onLevelModeChange={(programId, mode) =>
          setOpenLevelModes((prev) => ({ ...prev, [programId]: mode }))
        }
        catalogTick={catalogTick}
        onCatalogChange={() => setCatalogTick((t) => t + 1)}
        onAddProgram={() => {
          setErrors({});
          setIsAddDialogOpen(true);
        }}
        onEditProgram={(program) => {
          setEditingProgram(program);
          setEditProgramName(program.name);
          setErrors({});
          setIsEditDialogOpen(true);
        }}
        onDeleteProgram={(program) => {
          setDeletingProgram(program);
          setIsDeleteDialogOpen(true);
        }}
        onKitCountChange={(programId, count) =>
          setKitCounts((prev) =>
            prev[programId] === count ? prev : { ...prev, [programId]: count },
          )
        }
      />

      <AddProgramDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        programName={newProgramName}
        onProgramNameChange={(name) => {
          setNewProgramName(name);
          if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
        }}
        nameError={errors.name || addNameUniq.error}
        programCode={newProgramCode}
        onProgramCodeChange={setNewProgramCode}
        onSubmit={() => void handleAddProgram()}
      />
      <EditProgramDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editProgramName={editProgramName}
        onEditProgramNameChange={(name) => {
          setEditProgramName(name);
          if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
        }}
        nameError={errors.name || editNameUniq.error}
        onSubmit={() => void handleEditProgram()}
      />
      <DeleteProgramDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        deletingProgram={deletingProgram}
        onConfirm={() => void handleDeleteProgram()}
      />
    </>
  );
}
