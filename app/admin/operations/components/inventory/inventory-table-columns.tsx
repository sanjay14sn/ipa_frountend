"use client";

import React from "react";
import {
  ArrowRightLeft,
  Boxes,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { INVENTORY_CATEGORIES } from "@/lib/inventory-categories";

export type InventoryColumnCallbacks = {
  onAdjust: (item: InventoryItemSummary) => void;
  onProcurement: (itemId: number) => void;
  onEdit: (item: InventoryItemSummary) => void;
  onDelete: (item: InventoryItemSummary) => void;
};

export function buildInventoryColumns(
  callbacks: InventoryColumnCallbacks,
): DataTableColumn<InventoryItemSummary>[] {
  return [
    {
      key: "item",
      header: "Item",
    },
    {
      key: "category",
      header: "Category",
      render: (item) => item.category ?? "Uncategorized",
    },
    {
      key: "unitPrice",
      header: "Unit price",
      className: "text-right",
      render: (item) => `₹${item.unitPrice.toFixed(2)}`,
    },
    {
      key: "onHand",
      header: "On hand",
      className: "text-center",
      render: (item) => item.onHandQty,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const lowStock =
          item.isActive && item.availableQty <= item.reorderPoint;
        if (lowStock) return <StatusBadge tone="warning" label="Low stock" />;
        return <StatusBadge label={item.isActive ? "Active" : "Inactive"} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => callbacks.onAdjust(item)}
            title="Adjust on-hand stock"
            aria-label="Adjust on-hand stock"
          >
            <Boxes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => callbacks.onProcurement(item.id)}
            title="Manage sourcing in procurement"
            aria-label="Manage sourcing in procurement"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => callbacks.onEdit(item)}
            title="Edit item"
            aria-label="Edit item"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => callbacks.onDelete(item)}
            title="Delete item"
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

export function InventoryExpandedRow({ item }: { item: InventoryItemSummary }) {
  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Identity">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Name" value={item.name} />
          <DetailField label="SKU" value={item.sku ?? "—"} />
          <DetailField
            label="Legacy item code"
            value={item.legacyItemCode ?? "—"}
          />
          <DetailField
            label="Legacy ISO code"
            value={item.legacyIsoCode ?? "—"}
          />
          <DetailField
            label="Unit of measurement"
            value={item.unitOfMeasurement || "—"}
          />
          <DetailField
            label="Inventory type"
            value={item.inventoryType}
          />
          <DetailField
            label="Lifecycle"
            value={item.lifecycleStatus}
          />
          <DetailField
            label="Active"
            value={item.isActive ? "Yes" : "No"}
          />
          {item.description ? (
            <DetailField
              label="Description"
              value={item.description}
              span={4}
            />
          ) : null}
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Stock balances">
        <DetailFieldsGrid columns={4}>
          <DetailField label="On hand" value={String(item.onHandQty)} />
          <DetailField
            label="Reserved"
            value={String(item.reservedQty)}
          />
          <DetailField
            label="Available"
            value={String(item.availableQty)}
          />
          <DetailField
            label="On order"
            value={String(item.onOrderQty)}
          />
          <DetailField
            label="Avg cost"
            value={`₹${item.weightedAverageCost.toFixed(2)}`}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Reorder configuration">
        <DetailFieldsGrid columns={3}>
          <DetailField
            label="Reorder point"
            value={String(item.reorderPoint)}
          />
          <DetailField
            label="Safety stock"
            value={String(item.safetyStock)}
          />
          <DetailField
            label="Cycle"
            value={`${item.reorderCycleDays} days`}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}

export const INVENTORY_TABLE_FILTERS: DataTableFilter[] = [
  {
    key: "category",
    label: "Category",
    options: [
      { value: "all", label: "All categories" },
      ...INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c })),
    ],
    defaultValue: "all",
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "all", label: "All" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    defaultValue: "all",
  },
  {
    key: "lowStock",
    label: "Stock level",
    options: [
      { value: "all", label: "All items" },
      { value: "true", label: "Low stock only" },
    ],
    defaultValue: "all",
  },
];

export const INVENTORY_SORT_OPTIONS: DataTableSortOption[] = [
  { value: "name", label: "Name" },
  { value: "availableQty", label: "Available stock" },
  { value: "onHandQty", label: "On-hand stock" },
  { value: "createdAt", label: "Date added" },
];
