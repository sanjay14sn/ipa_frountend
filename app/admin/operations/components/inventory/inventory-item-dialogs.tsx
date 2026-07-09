"use client";

import React from "react";
import { ConfirmDialog, FormDialog } from "@/components/shared/dialog";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { InventoryForm } from "@/app/admin/operations/components/inventory/inventory-form";
import type { InventoryFormState } from "@/app/admin/operations/components/inventory/types";

// ── Add dialog ────────────────────────────────────────────────────────────────

export function AddInventoryDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: InventoryFormState;
  setForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
  onConfirm: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Add inventory item"
      formId="add-inventory-form"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
      submitLabel="Create item"
      cancelLabel="Cancel"
    >
      <InventoryForm form={form} setForm={setForm} />
    </FormDialog>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

export function EditInventoryDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: InventoryFormState;
  setForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
  onConfirm: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Edit inventory item"
      formId="edit-inventory-form"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
      submitLabel="Save changes"
      cancelLabel="Cancel"
    >
      <InventoryForm form={form} setForm={setForm} />
    </FormDialog>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

export function DeleteInventoryDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItemSummary | null;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Delete inventory item?"
      description={
        <>
          This removes &quot;{item?.name}&quot; from the catalog and drops its
          level-template assignments.
        </>
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}
