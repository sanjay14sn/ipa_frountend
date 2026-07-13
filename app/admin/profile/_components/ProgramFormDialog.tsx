"use client";

import { Input } from "@/components/ui/input";
import { Plus, Edit2 } from "lucide-react";
import {
  ConfirmDialog,
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";
import type { Program } from "@/services/program.service";

// ── Add-program dialog ───────────────────────────────────────────────────────

interface AddProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  onProgramNameChange: (name: string) => void;
  programCode: string;
  onProgramCodeChange: (code: string) => void;
  onSubmit: () => void;
}

export function AddProgramDialog({
  open,
  onOpenChange,
  programName,
  onProgramNameChange,
  programCode,
  onProgramCodeChange,
  onSubmit,
}: AddProgramDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Add New Program"
      description="Create a new program. You can add levels and inventory to it later."
      headerIcon={Plus}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Create Program"
    >
      <DialogFormField id="programName" label="Program Name" required>
        <Input
          id="programName"
          placeholder="e.g., Reading Literacy"
          value={programName}
          onChange={(e) => onProgramNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </DialogFormField>
      <DialogFormField id="programCode" label="Program Code">
        <Input
          id="programCode"
          placeholder="e.g., AB"
          value={programCode}
          onChange={(e) => onProgramCodeChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </DialogFormField>
    </FormDialog>
  );
}

// ── Edit-program dialog ──────────────────────────────────────────────────────

interface EditProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProgramName: string;
  onEditProgramNameChange: (name: string) => void;
  onSubmit: () => void;
}

export function EditProgramDialog({
  open,
  onOpenChange,
  editProgramName,
  onEditProgramNameChange,
  onSubmit,
}: EditProgramDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Edit Program"
      description="Update the program name."
      headerIcon={Edit2}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Save Changes"
    >
      <DialogFormField id="editProgramName" label="Program Name" required>
        <Input
          id="editProgramName"
          value={editProgramName}
          onChange={(e) => onEditProgramNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </DialogFormField>
    </FormDialog>
  );
}

// ── Delete-program confirm dialog ────────────────────────────────────────────

interface DeleteProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingProgram: Program | null;
  onConfirm: () => void;
}

export function DeleteProgramDialog({
  open,
  onOpenChange,
  deletingProgram,
  onConfirm,
}: DeleteProgramDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Delete program?"
      description={`This will permanently delete the program "${deletingProgram?.name}". This action cannot be undone and will also delete all associated levels and inventory.`}
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
