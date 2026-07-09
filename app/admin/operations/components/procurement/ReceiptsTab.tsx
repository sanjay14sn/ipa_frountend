"use client";

import { formatRupees } from "@/lib/currency-utils";
import { FormDialog } from "@/components/shared/dialog";

import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import type { PostPurchaseReceiptDto } from "@/services/procurement.service";
import { ProcurementRecordsCard } from "@/app/admin/operations/components/procurement/ProcurementRecordsCard";
import {
  ITEMS_PER_PAGE,
  type ReceiptPoLineSnapshot,
  type ReceiptRow,
} from "@/app/admin/operations/components/procurement/procurement-utils";
import { formatDateTime } from "@/lib/date-utils";
import type { InventoryItemSummary as InventoryItem } from "@/services/inventory.service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ReceiptsTabProps = {
  // Data
  receiptRows: ReceiptRow[];
  receiptsIsFetching: boolean;
  receiptsTotal: number;
  receiptsTotalPages: number;
  inventoryItems: InventoryItem[];
  // Filters / pagination
  receiptPage: number;
  receiptFilters: DataTableFilter[];
  // Callbacks - table
  onReceiptSearchChange: (value: string) => void;
  onReceiptFilterChange: (key: string, value: string | string[]) => void;
  onReceiptPageChange: (page: number) => void;
  // Receipt dialog
  isReceiptOpen: boolean;
  onReceiptOpenChange: (open: boolean) => void;
  receiptOrderId: number | null;
  receiptPoSnapshot: ReceiptPoLineSnapshot[] | null;
  receiptBody: PostPurchaseReceiptDto;
  onUpdateReceiptLine: (
    index: number,
    key: "receivedQty" | "rejectedQty",
    value: number,
  ) => void;
  onPostReceipt: () => void;
  submitting: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReceiptsTab({
  receiptRows,
  receiptsIsFetching,
  receiptsTotal,
  receiptsTotalPages,
  inventoryItems,
  receiptPage,
  receiptFilters,
  onReceiptSearchChange,
  onReceiptFilterChange,
  onReceiptPageChange,
  isReceiptOpen,
  onReceiptOpenChange,
  receiptOrderId,
  receiptPoSnapshot,
  receiptBody,
  onUpdateReceiptLine,
  onPostReceipt,
  submitting,
}: ReceiptsTabProps) {
  const receiptColumns: DataTableColumn<ReceiptRow>[] = [
    { key: "receipt", header: "Receipt" },
    {
      key: "purchaseOrder",
      header: "Purchase order",
      render: (receipt) => `PO #${receipt.purchaseOrderId}`,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (receipt) => receipt.supplierName,
    },
    {
      key: "postedAt",
      header: "Posted",
      render: (receipt) => formatDateTime(receipt.createdAt),
    },
    {
      key: "quantities",
      header: "Quantities",
      render: (receipt) => (
        <div className="space-y-1">
          <div>Received {receipt.totalReceived}</div>
          <div className="text-xs text-muted-foreground">
            Rejected {receipt.totalRejected}
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <TabsContent value="receipts" className="space-y-6">
        <ProcurementRecordsCard
          title="Receipts"
          description="Receipt history now lives in its own records view so teams can review inbound activity without reopening forms."
        >
          <DataTable<ReceiptRow>
            data={receiptRows}
            loading={receiptsIsFetching}
            columns={receiptColumns}
            getRowId={(receipt) => receipt.id}
            renderMainCell={(receipt) => (
              <div className="flex flex-col">
                <span className="font-medium">Receipt #{receipt.receiptId}</span>
                <span className="text-sm text-muted-foreground">
                  {receipt.lineCount} line{receipt.lineCount === 1 ? "" : "s"}
                  {receipt.linePreview ? ` - ${receipt.linePreview}` : ""}
                </span>
              </div>
            )}
            searchPlaceholder="Search receipts..."
            onSearchChange={(value) => onReceiptSearchChange(value)}
            filters={receiptFilters}
            onFilterChange={onReceiptFilterChange}
            pagination={{
              total: receiptsTotal,
              totalPages: receiptsTotalPages,
            }}
            currentPage={receiptPage}
            onPageChange={onReceiptPageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            resultsText={(count, total) =>
              `Showing ${count} of ${total} receipt${total === 1 ? "" : "s"}`
            }
            emptyMessage="No receipts have been posted yet."
          />
        </ProcurementRecordsCard>
      </TabsContent>

      <FormDialog
        open={isReceiptOpen}
        onOpenChange={onReceiptOpenChange}
        size="xl"
        scrollBody
        maxHeight="max-h-[min(80vh,580px)]"
        title="Post purchase receipt"
        description={
          receiptOrderId !== null
            ? `PO #${receiptOrderId} - ordered quantities are from the purchase order. Unit cost is taken from the PO line (not editable).`
            : undefined
        }
        formId="post-receipt-form"
        onSubmit={(e) => {
          e.preventDefault();
          void onPostReceipt();
        }}
        isSubmitting={submitting}
        submitLabel="Save receipt"
        cancelLabel="Cancel"
      >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
            {receiptBody.lines.map((line, index) => {
              const item = inventoryItems.find(
                (inventoryItem) => inventoryItem.id === line.inventoryItemId,
              );
              const meta = receiptPoSnapshot?.[index];
              const orderedQty = meta?.orderedQty ?? 0;
              const priorReceived = meta?.priorReceivedQty ?? 0;
              const openQty = Math.max(0, orderedQty - priorReceived);
              const moveTotal = line.receivedQty + line.rejectedQty;
              const exceedsOpen = moveTotal > openQty;
              const leavesOpen = Math.max(0, openQty - moveTotal);

              return (
                <div
                  key={`${line.inventoryItemId}-${index}`}
                  className="space-y-2 rounded-md border border-border/80 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-medium leading-snug">
                        {item?.name ?? `Item #${line.inventoryItemId}`}
                      </div>
                      <div className="text-xs leading-tight text-muted-foreground">
                        {item?.sku ?? "No SKU"}
                      </div>
                      <div className="pt-0.5 text-[11px] leading-tight text-muted-foreground">
                        <span>
                          This receipt:{" "}
                          <span className="font-medium text-foreground">
                            {line.receivedQty}
                          </span>{" "}
                          accepted,{" "}
                          <span className="font-medium text-foreground">
                            {line.rejectedQty}
                          </span>{" "}
                          rejected ({moveTotal} of {openQty} open)
                        </span>
                        {leavesOpen > 0 && !exceedsOpen ? (
                          <span className="text-muted-foreground">
                            {" "}
                            - {leavesOpen} still open after this receipt
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                      <div className="min-w-0 shrink-0 overflow-x-auto sm:overflow-visible">
                        <div className="flex w-max max-w-full shrink-0 items-center gap-2 rounded-md border bg-muted/30 px-1 py-1 sm:max-w-none sm:gap-0 sm:px-0 sm:py-1">
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Ordered
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {orderedQty}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Prev. recv.
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {priorReceived}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Open
                            </span>
                            <span className="flex h-8 items-center text-sm font-semibold tabular-nums leading-none">
                              {openQty}
                            </span>
                          </div>
                          <div className="flex min-w-[6.75rem] shrink-0 flex-col gap-0.5 border-l border-border/60 px-2 py-0 sm:min-w-[7rem] sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Unit cost
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {meta != null
                                ? formatRupees(meta.unitCost)
                                : formatRupees(line.unitCost)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Label className="text-xs leading-none text-muted-foreground">
                            Accepted
                          </Label>
                          <Input
                            className="h-8 w-[3.5rem] px-1.5 text-right text-xs tabular-nums"
                            type="number"
                            min={0}
                            step={1}
                            value={line.receivedQty || ""}
                            placeholder="0"
                            onChange={(event) =>
                              onUpdateReceiptLine(
                                index,
                                "receivedQty",
                                event.target.value === ""
                                  ? 0
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Label className="text-xs leading-none text-muted-foreground">
                            Rejected
                          </Label>
                          <Input
                            className="h-8 w-[3.5rem] px-1.5 text-right text-xs tabular-nums"
                            type="number"
                            min={0}
                            step={1}
                            value={line.rejectedQty || ""}
                            placeholder="0"
                            onChange={(event) =>
                              onUpdateReceiptLine(
                                index,
                                "rejectedQty",
                                event.target.value === ""
                                  ? 0
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {exceedsOpen ? (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
                      Accepted + rejected ({moveTotal}) is more than the open
                      quantity ({openQty}) for this line.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
      </FormDialog>
    </>
  );
}
