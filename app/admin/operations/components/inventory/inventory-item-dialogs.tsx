"use client";

import React from "react";
import { ConfirmDialog } from "@/components/shared/dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
        </DialogHeader>
        <InventoryForm form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Create item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit inventory item</DialogTitle>
        </DialogHeader>
        <InventoryForm form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
