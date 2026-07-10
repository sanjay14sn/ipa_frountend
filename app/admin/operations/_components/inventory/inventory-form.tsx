"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { DialogFormField } from "@/components/shared/dialog";
import { ToggleField } from "@/components/shared/toggle-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVENTORY_CATEGORIES } from "@/lib/inventory-categories";
import type { InventoryLifecycleStatus, InventoryType } from "@/services/inventory.service";
import {
  INVENTORY_TYPES,
  LIFECYCLE_STATUSES,
  type InventoryFormState,
} from "./types";

export function InventoryForm({
  form,
  setForm,
}: {
  form: InventoryFormState;
  setForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DialogFormField label="Name" className="md:col-span-2">
        <Input
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Description" className="md:col-span-2">
        <Textarea
          rows={2}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Category">
        <Select
          value={form.categoryName || undefined}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, categoryName: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DialogFormField>
      <DialogFormField label="Unit of measurement">
        <Input
          value={form.unitOfMeasurement}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              unitOfMeasurement: event.target.value,
            }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Unit price (₹)">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.unitPrice}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              unitPrice: Number(event.target.value) || 0,
            }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Legacy item code">
        <Input
          value={form.legacyItemCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyItemCode: event.target.value }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Legacy ISO code">
        <Input
          value={form.legacyIsoCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyIsoCode: event.target.value }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Inventory type">
        <Select
          value={form.inventoryType}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              inventoryType: value as InventoryType,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DialogFormField>
      <DialogFormField label="Lifecycle status">
        <Select
          value={form.lifecycleStatus}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              lifecycleStatus: value as InventoryLifecycleStatus,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIFECYCLE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DialogFormField>
      <DialogFormField label="Reorder point">
        <Input
          type="number"
          min={0}
          value={form.reorderPoint}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              reorderPoint: Number(event.target.value) || 0,
            }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Safety stock">
        <Input
          type="number"
          min={0}
          value={form.safetyStock}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              safetyStock: Number(event.target.value) || 0,
            }))
          }
        />
      </DialogFormField>
      <DialogFormField label="Reorder cycle days">
        <Input
          type="number"
          min={1}
          value={form.reorderCycleDays}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              reorderCycleDays: Number(event.target.value) || 30,
            }))
          }
        />
      </DialogFormField>
      <ToggleField
        label="Item status"
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
  );
}
