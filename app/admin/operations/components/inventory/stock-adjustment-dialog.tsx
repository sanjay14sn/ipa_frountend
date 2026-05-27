"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItemSummary } from "@/services/inventory.service";
import type {
  AdjustmentDirection,
  AdjustmentFormState,
} from "@/app/admin/operations/components/inventory/types";

export type AdjustmentPreview = {
  error: string | null;
  deltaQty: number;
  projected: number;
};

export function StockAdjustmentDialog({
  open,
  adjustingItem,
  adjustForm,
  setAdjustForm,
  adjustPreview,
  isAdjustSubmitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  adjustingItem: InventoryItemSummary | null;
  adjustForm: AdjustmentFormState;
  setAdjustForm: React.Dispatch<React.SetStateAction<AdjustmentFormState>>;
  adjustPreview: AdjustmentPreview;
  isAdjustSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        {adjustingItem ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{adjustingItem.name}</div>
              <div className="text-xs text-muted-foreground">
                {adjustingItem.sku}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">On hand</div>
                  <div className="text-base font-medium text-foreground">
                    {adjustingItem.onHandQty}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reserved</div>
                  <div className="text-base font-medium text-foreground">
                    {adjustingItem.reservedQty}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Available</div>
                  <div className="text-base font-medium text-foreground">
                    {adjustingItem.availableQty}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={adjustForm.direction}
                onValueChange={(value) =>
                  setAdjustForm((prev) => ({
                    ...prev,
                    direction: value as AdjustmentDirection,
                    // Clear cost when switching to decrease (cost only
                    // applies to increases)
                    unitCost: value === "INCREASE" ? prev.unitCost : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCREASE">
                    Increase (add stock)
                  </SelectItem>
                  <SelectItem value="DECREASE">
                    Decrease (remove stock)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 5"
                value={adjustForm.quantity}
                onChange={(event) =>
                  setAdjustForm((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Projected on-hand after this adjustment:{" "}
                <span
                  className={
                    adjustPreview.projected < 0
                      ? "font-medium text-destructive"
                      : "font-medium text-foreground"
                  }
                >
                  {adjustPreview.projected}
                </span>
              </p>
              {adjustPreview.error ? (
                <p className="text-xs text-destructive">
                  {adjustPreview.error}
                </p>
              ) : null}
            </div>

            {adjustForm.direction === "INCREASE" ? (
              <div className="space-y-2">
                <Label>Unit cost (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={`Leaves WAC at ₹${adjustingItem.weightedAverageCost.toFixed(2)} when blank`}
                  value={adjustForm.unitCost}
                  onChange={(event) =>
                    setAdjustForm((prev) => ({
                      ...prev,
                      unitCost: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Supply a cost to blend into the weighted average; leave
                  blank to add quantity without changing WAC.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Physical recount, damaged in storage, returned by franchisee..."
                value={adjustForm.reason}
                onChange={(event) =>
                  setAdjustForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Stored on the audit trail. Required. Up to 500 characters.
              </p>
            </div>

            {adjustForm.direction === "INCREASE" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                Positive adjustments automatically replenish any
                backordered orders for this item, oldest first.
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isAdjustSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={
              isAdjustSubmitting ||
              Boolean(adjustPreview.error) ||
              !adjustForm.quantity.trim() ||
              !adjustForm.reason.trim()
            }
          >
            {isAdjustSubmitting ? "Saving..." : "Apply adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
