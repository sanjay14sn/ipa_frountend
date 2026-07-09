"use client";

import React, { useMemo, useState } from "react";
import { Check, Loader2, Truck, X } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DispatchPickerItem {
  id: number;
  label: string;
  sublabel?: string;
  requestDate: string;
  /** Display e.g. "42/50" for certificate level marks */
  levelMarks?: string;
  /** Course instructor name */
  ciName?: string;
  /** Student level code (e.g. program level code) when available */
  levelCode?: string;
}

export interface DispatchEligibleOrder {
  id: number;
  referenceId: string;
  orderType: string;
  createdAt: string;
  shipment: { status: string } | null;
  itemCount: number;
}

function itemMatchesSearch(item: DispatchPickerItem, q: string) {
  if (!q.trim()) return true;
  const blob = [
    item.label,
    item.sublabel,
    item.requestDate,
    item.levelMarks,
    item.ciName,
    item.levelCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(q.trim().toLowerCase());
}

function itemMetaLine(item: DispatchPickerItem) {
  const parts: string[] = [];
  if (item.levelCode) parts.push(item.levelCode);
  if (item.levelMarks) parts.push(`Marks ${item.levelMarks}`);
  if (item.ciName) parts.push(item.ciName);
  if (item.requestDate) parts.push(item.requestDate);
  return parts.join(" · ");
}

interface BulkDispatchPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: DispatchPickerItem[];
  eligibleOrders: DispatchEligibleOrder[];
  isLoadingOrders: boolean;
  onConfirm: (selectedIds: number[], orderId: number | null) => Promise<void>;
}

export function BulkDispatchPickerModal({
  open,
  onOpenChange,
  title,
  items,
  eligibleOrders,
  isLoadingOrders,
  onConfirm,
}: BulkDispatchPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [orderMode, setOrderMode] = useState<"new" | "existing">("new");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(
    () => items.filter((i) => itemMatchesSearch(i, search)),
    [items, search],
  );

  function toggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const pendingCount = selectedIds.length;
  const isDirty = pendingCount > 0;

  const isConfirmDisabled =
    selectedIds.length === 0 ||
    isSubmitting ||
    (orderMode === "existing" && selectedOrderId === null);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedIds, orderMode === "existing" ? selectedOrderId : null);
      setSelectedIds([]);
      setSearch("");
      setOrderMode("new");
      setSelectedOrderId(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollBody
      maxHeight="max-h-[85vh]"
    >
      <AppDialogHeader
        title={`Dispatch ${title}`}
        description="Choose how to dispatch, then select the items to include."
        icon={Truck}
      />

      <AppDialogBody>
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium text-gray-900">Dispatch as</p>
            <div className="space-y-1 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="orderMode"
                  checked={orderMode === "new"}
                  onChange={() => {
                    setOrderMode("new");
                    setSelectedOrderId(null);
                  }}
                  className="h-4 w-4 accent-primary"
                />
                Create as new dispatch order
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="orderMode"
                  checked={orderMode === "existing"}
                  onChange={() => setOrderMode("existing")}
                  className="h-4 w-4 accent-primary"
                />
                Add to existing order
              </label>
            </div>

            {orderMode === "existing" ? (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border bg-white">
                {isLoadingOrders ? (
                  <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading orders…
                  </div>
                ) : eligibleOrders.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-gray-500">
                    No eligible orders found for this franchise.
                  </div>
                ) : (
                  eligibleOrders.map((order) => {
                    const selected = selectedOrderId === order.id;
                    return (
                      <label
                        key={order.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0",
                          selected ? "bg-primary/10" : "hover:bg-gray-50",
                        )}
                      >
                        <input
                          type="radio"
                          name="selectedOrder"
                          checked={selected}
                          onChange={() => setSelectedOrderId(order.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="font-medium text-gray-900">{order.referenceId}</span>
                        <span className="text-muted-foreground">{order.orderType}</span>
                        <span className="text-muted-foreground">
                          {order.shipment?.status ?? "Awaiting shipment"}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
            {/* Header row — matches InventoryCheckboxLinkPanel */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-gray-900">Add to dispatch</h4>
            </div>

            {/* Section 2: Temp selection — same shell as inventory pending block */}
            {isDirty ? (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-medium text-gray-900">
                  {pendingCount} selected — not yet dispatched
                </p>
                {selectedIds.map((id) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  const meta = itemMetaLine(item);
                  return (
                    <div key={id} className="flex items-center gap-2 py-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {item.label}
                        </div>
                        {meta ? (
                          <div className="truncate text-xs text-gray-500">{meta}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        aria-label={`Remove ${item.label} from selection`}
                        className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Section 3: Searchable list */}
            <Input
              className="mt-3"
              placeholder="Search by name, roll number, marks, or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-sm text-gray-500">
                  {items.length === 0
                    ? "No items available for this list."
                    : "No items match your search."}
                </div>
              ) : (
                filtered.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  const meta = itemMetaLine(item);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0",
                        checked ? "bg-primary/10" : "hover:bg-gray-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-gray-300 bg-white text-transparent",
                        )}
                        aria-label={checked ? `Uncheck ${item.label}` : `Check ${item.label}`}
                      >
                        <Check className="h-3 w-3" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {item.label}
                        </div>
                        {meta ? (
                          <div className="mt-0.5 truncate text-xs text-gray-500">{meta}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </AppDialogBody>

      <AppDialogFooter
        sticky
        secondary={{
          label: "Cancel",
          onClick: () => onOpenChange(false),
          disabled: isSubmitting,
        }}
        primary={{
          label: isSubmitting
            ? "Dispatching…"
            : `Dispatch ${selectedIds.length > 0 ? `${selectedIds.length} ` : ""}${title}`,
          onClick: () => void handleConfirm(),
          loading: isSubmitting,
          disabled: isConfirmDisabled,
        }}
      />
    </AppDialog>
  );
}
