"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes &quot;{item?.name}&quot; from the catalog and drops its
            level-template assignments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
