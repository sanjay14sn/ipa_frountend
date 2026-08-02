"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleField } from "@/components/shared/toggle-field";
import { cn } from "@/lib/utils";
import { Plus, Edit2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
} from "@/components/shared/dialog";
import type { Stream } from "@/services/stream.service";
import type { CreateLevelDto, UpdateLevelDto, Level } from "@/services/level.service";

const errorClass = "border-destructive focus-visible:ring-destructive";

// ── Add-level form state ─────────────────────────────────────────────────────

export type AddLevelFormData = Omit<CreateLevelDto, "programId">;

interface AddLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  streams: Stream[];
  formData: AddLevelFormData;
  onFormDataChange: (data: AddLevelFormData) => void;
  displayOrderError?: string;
  onSubmit: () => void;
}

export function AddLevelDialog({
  open,
  onOpenChange,
  programName,
  streams,
  formData,
  onFormDataChange,
  displayOrderError,
  onSubmit,
}: AddLevelDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Add level"
      description={`Create a new step in ${programName}. Stream and display order are set automatically for this row.`}
      headerIcon={Plus}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Create"
    >
      <DialogFormField label="Stream">
        <Input
          value={
            streams.find((stream) => stream.id === formData.streamId)?.name ?? ""
          }
          readOnly
          disabled
        />
      </DialogFormField>
      <DialogFormGrid cols={2}>
        <DialogFormField id="addLevelName" label="Level" required>
          <Input
            id="addLevelName"
            value={formData.name}
            placeholder="e.g., Level 1"
            onChange={(e) =>
              onFormDataChange({ ...formData, name: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
        </DialogFormField>
        <DialogFormField id="addLevelCode" label="Code" required>
          <Input
            id="addLevelCode"
            value={formData.code}
            placeholder="e.g., L1"
            onChange={(e) =>
              onFormDataChange({ ...formData, code: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
        </DialogFormField>
      </DialogFormGrid>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Total marks" required>
          <Input
            type="number"
            min={0}
            value={formData.totalMarks === 0 ? "" : formData.totalMarks}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({
                ...formData,
                totalMarks: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
        <DialogFormField label="Pass mark" required>
          <Input
            type="number"
            min={0}
            value={formData.passMark === 0 ? "" : formData.passMark}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({
                ...formData,
                passMark: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
      </DialogFormGrid>
      <DialogFormField label="Duration (months)" required>
        <Input
          type="number"
          min={1}
          value={
            formData.durationInMonths === 0 ? "" : formData.durationInMonths
          }
          onChange={(e) => {
            const value = e.target.value;
            onFormDataChange({
              ...formData,
              durationInMonths: value === "" ? 0 : Number(value),
            });
          }}
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
      <div
        className={cn(
          "rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          displayOrderError && "border-destructive",
        )}
      >
        This will be added as position #{formData.displayOrder} in the
        selected stream.
      </div>
      {displayOrderError ? (
        <p className="text-xs text-destructive">{displayOrderError}</p>
      ) : null}
    </FormDialog>
  );
}

// ── Edit-level form dialog ───────────────────────────────────────────────────

interface EditLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streams: Stream[];
  editFormData: UpdateLevelDto;
  onEditFormDataChange: (data: UpdateLevelDto) => void;
  displayOrderError?: string;
  onSubmit: () => void;
}

export function EditLevelDialog({
  open,
  onOpenChange,
  streams,
  editFormData,
  onEditFormDataChange,
  displayOrderError,
  onSubmit,
}: EditLevelDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Edit level"
      headerIcon={Edit2}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Save"
    >
      <DialogFormField label="Stream">
        <Select
          value={
            editFormData.streamId != null && editFormData.streamId > 0
              ? String(editFormData.streamId)
              : undefined
          }
          onValueChange={(value) =>
            onEditFormDataChange({
              ...editFormData,
              streamId: Number(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stream" />
          </SelectTrigger>
          <SelectContent>
            {streams.map((stream) => (
              <SelectItem key={stream.id} value={String(stream.id)}>
                {stream.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DialogFormField>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Name">
          <Input
            value={editFormData.name || ""}
            onChange={(e) =>
              onEditFormDataChange({ ...editFormData, name: e.target.value })
            }
          />
        </DialogFormField>
        <DialogFormField label="Code">
          <Input
            value={editFormData.code || ""}
            onChange={(e) =>
              onEditFormDataChange({ ...editFormData, code: e.target.value })
            }
          />
        </DialogFormField>
      </DialogFormGrid>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Total marks">
          <Input
            type="number"
            value={
              editFormData.totalMarks === 0 ||
              editFormData.totalMarks === undefined
                ? ""
                : editFormData.totalMarks
            }
            onChange={(e) => {
              const value = e.target.value;
              onEditFormDataChange({
                ...editFormData,
                totalMarks: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
        <DialogFormField label="Pass mark">
          <Input
            type="number"
            value={
              editFormData.passMark === 0 ||
              editFormData.passMark === undefined
                ? ""
                : editFormData.passMark
            }
            onChange={(e) => {
              const value = e.target.value;
              onEditFormDataChange({
                ...editFormData,
                passMark: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
      </DialogFormGrid>
      <DialogFormGrid cols={2}>
        <DialogFormField label="Display order" error={displayOrderError}>
          <Input
            type="number"
            className={cn(displayOrderError && errorClass)}
            value={
              editFormData.displayOrder === 0 ||
              editFormData.displayOrder === undefined
                ? ""
                : editFormData.displayOrder
            }
            onChange={(e) => {
              const value = e.target.value;
              onEditFormDataChange({
                ...editFormData,
                displayOrder: value === "" ? 0 : Number(value),
              });
            }}
          />
        </DialogFormField>
        <DialogFormField label="Duration (months)">
          <Input
            type="number"
            min={1}
            value={
              editFormData.durationInMonths === 0 ||
              editFormData.durationInMonths === undefined
                ? ""
                : editFormData.durationInMonths
            }
            onChange={(e) => {
              const value = e.target.value;
              onEditFormDataChange({
                ...editFormData,
                durationInMonths: value === "" ? 3 : Number(value),
              });
            }}
          />
        </DialogFormField>
      </DialogFormGrid>
      <ToggleField
        label="Status"
        value={(editFormData.isActive ?? false) ? "active" : "inactive"}
        onValueChange={(v) =>
          onEditFormDataChange({ ...editFormData, isActive: v === "active" })
        }
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
    </FormDialog>
  );
}

// ── Delete-level confirm dialog ──────────────────────────────────────────────

interface DeleteLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingLevel: Level | null;
  onConfirm: () => void;
}

export function DeleteLevelDialog({
  open,
  onOpenChange,
  deletingLevel,
  onConfirm,
}: DeleteLevelDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Delete level?"
      description={`Remove "${deletingLevel?.name}" and its inventory links.`}
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
