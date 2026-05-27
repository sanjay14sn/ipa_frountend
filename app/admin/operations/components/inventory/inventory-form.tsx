"use client";

import React from "react";
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
import { INVENTORY_CATEGORIES } from "@/lib/inventory-categories";
import type { InventoryLifecycleStatus, InventoryType } from "@/services/inventory.service";
import {
  INVENTORY_TYPES,
  LIFECYCLE_STATUSES,
  type InventoryFormState,
} from "@/app/admin/operations/components/inventory/types";

export function InventoryForm({
  form,
  setForm,
}: {
  form: InventoryFormState;
  setForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Description</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
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
      </div>
      <div className="space-y-2">
        <Label>Unit of measurement</Label>
        <Input
          value={form.unitOfMeasurement}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              unitOfMeasurement: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Legacy item code</Label>
        <Input
          value={form.legacyItemCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyItemCode: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Legacy ISO code</Label>
        <Input
          value={form.legacyIsoCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyIsoCode: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Inventory type</Label>
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
      </div>
      <div className="space-y-2">
        <Label>Lifecycle status</Label>
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
      </div>
      <div className="space-y-2">
        <Label>Reorder point</Label>
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
      </div>
      <div className="space-y-2">
        <Label>Safety stock</Label>
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
      </div>
      <div className="space-y-2">
        <Label>Reorder cycle days</Label>
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
      </div>
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
