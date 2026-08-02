"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ConfirmDialog,
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { Stream } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";

const errorClass = "border-destructive focus-visible:ring-destructive";

// ── Transition form state ────────────────────────────────────────────────────

export interface TransitionFormData {
  fromStreamId: string;
  toStreamId: string;
  toLevelDisplayOrder: string;
}

// ── Add/Edit transition dialog ───────────────────────────────────────────────

interface StreamTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransition: StreamTransition | null;
  transitionForm: TransitionFormData;
  onTransitionFormChange: (data: TransitionFormData) => void;
  fromStreamError?: string;
  streams: Stream[];
  onSubmit: () => void;
}

export function StreamTransitionDialog({
  open,
  onOpenChange,
  editingTransition,
  transitionForm,
  onTransitionFormChange,
  fromStreamError,
  streams,
  onSubmit,
}: StreamTransitionDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={editingTransition ? "Edit transition" : "Add transition"}
      description="After a student finishes all levels in the source stream, they continue in the target stream at the given level order."
      headerIcon={GitBranch}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      submitLabel="Save"
    >
      <DialogFormField label="From stream" error={fromStreamError}>
        <Select
          value={transitionForm.fromStreamId}
          onValueChange={(v) =>
            onTransitionFormChange({ ...transitionForm, fromStreamId: v })
          }
        >
          <SelectTrigger className={cn(fromStreamError && errorClass)}>
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
            onTransitionFormChange({ ...transitionForm, toStreamId: v })
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
            onTransitionFormChange({
              ...transitionForm,
              toLevelDisplayOrder: e.target.value,
            })
          }
          onFocus={selectInputValueOnFocus}
        />
      </DialogFormField>
    </FormDialog>
  );
}

// ── Delete transition confirm dialog ─────────────────────────────────────────

interface DeleteTransitionDialogProps {
  deletingTransition: StreamTransition | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteTransitionDialog({
  deletingTransition,
  onOpenChange,
  onConfirm,
}: DeleteTransitionDialogProps) {
  return (
    <ConfirmDialog
      open={!!deletingTransition}
      onOpenChange={(o) => !o && onOpenChange(false)}
      variant="destructive"
      title="Remove transition?"
      description="This only removes the mapping; levels are unchanged."
      confirmLabel="Remove"
      onConfirm={onConfirm}
    />
  );
}
