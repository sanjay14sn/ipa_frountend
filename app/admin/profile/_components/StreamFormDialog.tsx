"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleField } from "@/components/shared/toggle-field";
import { Plus, Edit2 } from "lucide-react";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
} from "@/components/shared/dialog";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { Stream, UpdateStreamDto } from "@/services/stream.service";

// ── Add-stream form state ────────────────────────────────────────────────────

export interface AddStreamFormData {
  name: string;
  isActive: boolean;
  hasStartingKit: boolean;
  minAge: string;
  maxAge: string;
  displayOrder: string;
}

interface AddStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  formData: AddStreamFormData;
  onFormDataChange: (data: AddStreamFormData) => void;
  onSubmit: () => void;
}

export function AddStreamDialog({
  open,
  onOpenChange,
  programName,
  formData,
  onFormDataChange,
  onSubmit,
}: AddStreamDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Add stream"
      description={`For ${programName}`}
      headerIcon={Plus}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Create"
    >
      <DialogFormField label="Name" required>
        <Input
          value={formData.name}
          onChange={(e) =>
            onFormDataChange({ ...formData, name: e.target.value })
          }
          placeholder="e.g. Elementary"
        />
      </DialogFormField>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Min age">
          <Input
            value={formData.minAge}
            onChange={(e) =>
              onFormDataChange({ ...formData, minAge: e.target.value })
            }
            placeholder="optional"
          />
        </DialogFormField>
        <DialogFormField label="Max age">
          <Input
            value={formData.maxAge}
            onChange={(e) =>
              onFormDataChange({ ...formData, maxAge: e.target.value })
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
            onFormDataChange({ ...formData, displayOrder: e.target.value })
          }
          onFocus={selectInputValueOnFocus}
          placeholder="0"
        />
      </DialogFormField>
      <ToggleField
        label="Status"
        value={formData.isActive ? "active" : "inactive"}
        onValueChange={(v) =>
          onFormDataChange({ ...formData, isActive: v === "active" })
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
          onFormDataChange({ ...formData, hasStartingKit: v === "yes" })
        }
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
    </FormDialog>
  );
}

// ── Edit-stream form dialog ──────────────────────────────────────────────────

interface EditStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFormData: UpdateStreamDto;
  onEditFormDataChange: (data: UpdateStreamDto) => void;
  onSubmit: () => void;
}

export function EditStreamDialog({
  open,
  onOpenChange,
  editFormData,
  onEditFormDataChange,
  onSubmit,
}: EditStreamDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Edit stream"
      headerIcon={Edit2}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Save"
    >
      <DialogFormField label="Name">
        <Input
          value={editFormData.name ?? ""}
          onChange={(e) =>
            onEditFormDataChange({ ...editFormData, name: e.target.value })
          }
        />
      </DialogFormField>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Min age">
          <Input
            value={
              editFormData.minAge === null || editFormData.minAge === undefined
                ? ""
                : String(editFormData.minAge)
            }
            onChange={(e) => {
              const v = e.target.value;
              onEditFormDataChange({
                ...editFormData,
                minAge: v === "" ? null : Number(v),
              });
            }}
          />
        </DialogFormField>
        <DialogFormField label="Max age">
          <Input
            value={
              editFormData.maxAge === null || editFormData.maxAge === undefined
                ? ""
                : String(editFormData.maxAge)
            }
            onChange={(e) => {
              const v = e.target.value;
              onEditFormDataChange({
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
            onEditFormDataChange({
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
          onEditFormDataChange({ ...editFormData, isActive: v === "active" })
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
          onEditFormDataChange({
            ...editFormData,
            hasStartingKit: v === "yes",
          })
        }
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
    </FormDialog>
  );
}

// ── Delete-stream confirm dialog ─────────────────────────────────────────────

interface DeleteStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingStream: Stream | null;
  onConfirm: () => void;
}

export function DeleteStreamDialog({
  open,
  onOpenChange,
  deletingStream,
  onConfirm,
}: DeleteStreamDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Delete stream?"
      description={`Remove "${deletingStream?.name}" (no levels must remain).`}
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
