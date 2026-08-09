"use client";

import { useState } from "react";
import { formatRupees } from "@/lib/currency-utils";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { ProcurementBulkLinePicker } from "@/components/procurement/ProcurementBulkLinePicker";
import type {
  PurchaseOrderLineInput,
  PurchaseOrderSummary,
  Supplier,
  SupplierItemTerm,
} from "@/services/procurement.service";
import { ProcurementRecordsCard } from "./ProcurementRecordsCard";
import {
  DateToolbarField,
  ITEMS_PER_PAGE,
  statusBadge,
  type PurchaseOrderFormState,
} from "./procurement-utils";
import { formatDate } from "@/lib/date-utils";
import type { InventoryItemSummary as InventoryItem } from "@/services/inventory.service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PurchaseOrdersTabProps = {
  // Data
  purchaseOrders: PurchaseOrderSummary[] | undefined;
  purchaseOrdersIsFetching: boolean;
  purchaseOrdersTotal: number;
  purchaseOrdersTotalPages: number;
  allSupplierTermsIsLoading: boolean;
  supplierTermsForPo: SupplierItemTerm[];
  purchaseOrderSuppliersSorted: Supplier[];
  inventoryItems: InventoryItem[];
  inventoryIsLoading: boolean;
  // Filters / pagination
  purchaseOrderPage: number;
  purchaseOrderDateFrom: string;
  purchaseOrderDateTo: string;
  purchaseOrderFilters: DataTableFilter[];
  // Callbacks - table
  onPurchaseOrderSearchChange: (value: string) => void;
  onPurchaseOrderFilterChange: (key: string, value: string | string[]) => void;
  onPurchaseOrderPageChange: (page: number) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onOpenReceiptDialog: (orderId: number) => void;
  onConfirmPurchaseOrder: (orderId: number) => void;
  onCancelPurchaseOrder: (orderId: number) => void;
  /** PO id with a confirm/cancel in flight (disables that row's actions). */
  poActionOrderId: number | null;
  onOpenPurchaseOrderModal: () => void;
  // PO create dialog
  isPurchaseOrderOpen: boolean;
  onPurchaseOrderOpenChange: (open: boolean) => void;
  poForm: PurchaseOrderFormState;
  onPoFormChange: (patch: Partial<PurchaseOrderFormState>) => void;
  onPurchaseOrderSupplierSelect: (value: string) => void;
  poLineSeed: PurchaseOrderLineInput[] | undefined;
  onPoLineSeedChange: (seed: PurchaseOrderLineInput[] | undefined) => void;
  onPurchaseOrderPickerSubmit: (lines: PurchaseOrderLineInput[]) => Promise<void>;
  submitting: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrdersTab({
  purchaseOrders,
  purchaseOrdersIsFetching,
  purchaseOrdersTotal,
  purchaseOrdersTotalPages,
  allSupplierTermsIsLoading,
  supplierTermsForPo,
  purchaseOrderSuppliersSorted,
  inventoryItems,
  inventoryIsLoading,
  purchaseOrderPage,
  purchaseOrderDateFrom,
  purchaseOrderDateTo,
  purchaseOrderFilters,
  onPurchaseOrderSearchChange,
  onPurchaseOrderFilterChange,
  onPurchaseOrderPageChange,
  onDateFromChange,
  onDateToChange,
  onOpenReceiptDialog,
  onConfirmPurchaseOrder,
  onCancelPurchaseOrder,
  poActionOrderId,
  onOpenPurchaseOrderModal,
  isPurchaseOrderOpen,
  onPurchaseOrderOpenChange,
  poForm,
  onPoFormChange,
  onPurchaseOrderSupplierSelect,
  poLineSeed,
  onPoLineSeedChange,
  onPurchaseOrderPickerSubmit,
  submitting,
}: PurchaseOrdersTabProps) {
  const [cancelPoTarget, setCancelPoTarget] =
    useState<PurchaseOrderSummary | null>(null);

  const purchaseOrderColumns: DataTableColumn<PurchaseOrderSummary>[] = [
    { key: "order", header: "Purchase order" },
    {
      key: "supplier",
      header: "Supplier",
      render: (order) => order.supplier?.name ?? "Unknown supplier",
    },
    {
      key: "status",
      header: "Status",
      render: (order) => statusBadge(order.status),
    },
    {
      key: "expected",
      header: "Expected",
      render: (order) => formatDate(order.expectedDeliveryAt),
    },
    {
      key: "lines",
      header: "Lines",
      render: (order) => (
        <span>
          {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (order) => formatRupees(order.totalCost),
    },
    {
      key: "actions",
      header: "Action",
      render: (order) => {
        const busy = poActionOrderId === order.id;
        const cancelButton = (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => setCancelPoTarget(order)}
          >
            Cancel
          </Button>
        );
        const postReceiptButton = (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onOpenReceiptDialog(order.id)}
          >
            Post receipt
          </Button>
        );
        switch (order.status) {
          case "DRAFT":
            return (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onConfirmPurchaseOrder(order.id)}
                >
                  Confirm
                </Button>
                {cancelButton}
              </div>
            );
          case "CONFIRMED":
            return (
              <div className="flex items-center gap-1">
                {postReceiptButton}
                {cancelButton}
              </div>
            );
          case "PARTIALLY_RECEIVED":
            return postReceiptButton;
          case "RECEIVED":
          case "CANCELLED":
            return <span className="text-sm text-muted-foreground">Closed</span>;
          default:
            // Unknown/legacy status — keep the pre-lifecycle behavior.
            return postReceiptButton;
        }
      },
    },
  ];

  return (
    <>
      <TabsContent value="purchase-orders" className="space-y-6">
        <ProcurementRecordsCard
          title="Purchase orders"
          description="Track purchase orders as records, with creation moved into a focused modal."
        >
          <DataTable<PurchaseOrderSummary>
            data={purchaseOrders ?? []}
            loading={purchaseOrdersIsFetching}
            columns={purchaseOrderColumns}
            getRowId={(order) => String(order.id)}
            renderMainCell={(order) => (
              <div className="flex flex-col">
                <span className="font-medium">
                  {order.referenceNo || "Purchase order"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {order.supplier?.name ?? "No supplier"}
                </span>
              </div>
            )}
            searchPlaceholder="Search purchase orders..."
            onSearchChange={(value) => onPurchaseOrderSearchChange(value)}
            filters={purchaseOrderFilters}
            onFilterChange={onPurchaseOrderFilterChange}
            pagination={{
              total: purchaseOrdersTotal,
              totalPages: purchaseOrdersTotalPages,
            }}
            currentPage={purchaseOrderPage}
            onPageChange={onPurchaseOrderPageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            resultsText={(count, total) =>
              `Showing ${count} of ${total} purchase order${total === 1 ? "" : "s"}`
            }
            emptyMessage="No purchase orders match the current filters."
            toolbarActions={
              <>
                <DateToolbarField
                  label="From"
                  value={purchaseOrderDateFrom}
                  onChange={(value) => {
                    onPurchaseOrderPageChange(1);
                    onDateFromChange(value);
                  }}
                />
                <DateToolbarField
                  label="To"
                  value={purchaseOrderDateTo}
                  onChange={(value) => {
                    onPurchaseOrderPageChange(1);
                    onDateToChange(value);
                  }}
                />
                <Button onClick={() => onOpenPurchaseOrderModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create PO
                </Button>
              </>
            }
          />
        </ProcurementRecordsCard>
      </TabsContent>

      <AppDialog
        open={isPurchaseOrderOpen}
        onOpenChange={(open) => {
          onPurchaseOrderOpenChange(open);
          if (!open) {
            onPoLineSeedChange(undefined);
          }
        }}
        size="xl"
        padding="flush"
        scrollBody
      >
        <AppDialogHeader
          title="Create purchase order"
          description="Choose supplier sourcing terms as lines; quantity and unit cost default from each term. Save on the picker creates the order."
          icon={Plus}
          sticky
        />
        <AppDialogBody layout="fill" className="space-y-3">
          <div className="shrink-0 space-y-3">
            <DialogFormGrid cols={3}>
              <DialogFormField label="Supplier">
                <Select
                  value={poForm.supplierId === "" ? "none" : String(poForm.supplierId)}
                  onValueChange={onPurchaseOrderSupplierSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose supplier</SelectItem>
                    {purchaseOrderSuppliersSorted.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                        {!supplier.isActive ? " (inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DialogFormField>
              <DialogFormField label="Reference">
                <Input
                  value={poForm.referenceNo}
                  onChange={(event) =>
                    onPoFormChange({ referenceNo: event.target.value })
                  }
                />
              </DialogFormField>
              <DialogFormField label="Expected delivery">
                <DateInput
                  value={poForm.expectedDeliveryAt}
                  onChange={(v) => onPoFormChange({ expectedDeliveryAt: v })}
                />
              </DialogFormField>
            </DialogFormGrid>
            <DialogFormField label="Notes">
              <Textarea
                rows={1}
                className="min-h-9 resize-y py-2 text-sm leading-snug"
                value={poForm.notes}
                onChange={(event) => onPoFormChange({ notes: event.target.value })}
              />
            </DialogFormField>
          </div>
          {poForm.supplierId !== "" ? (
            <ProcurementBulkLinePicker
              key={`po-${String(poForm.supplierId)}-${JSON.stringify(poLineSeed ?? [])}`}
              mode="purchase-order"
              resetKey={`${String(poForm.supplierId)}-${JSON.stringify(poLineSeed ?? [])}`}
              catalogItems={inventoryItems}
              isCatalogLoading={inventoryIsLoading}
              excludeInventoryIds={new Set()}
              supplierTerms={supplierTermsForPo}
              supplierTermsCatalogLoading={allSupplierTermsIsLoading}
              initialPoLines={poLineSeed}
              onSubmitPo={onPurchaseOrderPickerSubmit}
            />
          ) : (
            <p className="shrink-0 text-sm text-muted-foreground">
              Select a supplier to add order lines.
            </p>
          )}
        </AppDialogBody>
        <AppDialogFooter
          sticky
          padded
          secondary={{
            label: "Cancel",
            onClick: () => {
              onPurchaseOrderOpenChange(false);
              onPoLineSeedChange(undefined);
            },
          }}
        />
      </AppDialog>

      <ConfirmDialog
        open={cancelPoTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelPoTarget(null);
        }}
        variant="destructive"
        title="Cancel purchase order?"
        description={
          cancelPoTarget
            ? `${cancelPoTarget.referenceNo || "This purchase order"} will be cancelled. This cannot be undone.`
            : undefined
        }
        confirmLabel="Cancel purchase order"
        cancelLabel="Keep"
        onConfirm={() => {
          if (!cancelPoTarget) return;
          const id = cancelPoTarget.id;
          setCancelPoTarget(null);
          onCancelPurchaseOrder(id);
        }}
      />
    </>
  );
}
