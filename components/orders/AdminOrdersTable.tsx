"use client";

import { useCallback, useMemo, useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { FormDialog } from "@/components/shared/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DcDownload } from "@/components/orders/DcDownload";
import { formatRupees } from "@/lib/currency-utils";
import { orderTypeLabel } from "@/lib/payment-details-display";
import {
  cancelOrderAdmin,
  markOrderPaidAdmin,
  refreshOrderAllocationAdmin,
  type OrderData,
  type OrderItemData,
} from "@/services/order.service";
import { verifyShipment, downloadChallan, regenerateDc, type VerifyShipmentDto } from "@/services/fulfillment.service";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";
import { VerifyShipmentDialog } from "@/components/shipping/VerifyShipmentDialog";
import { AdminOrderInvoiceDialog } from "./AdminOrderInvoiceDialog";
import { DispatchItemsSummaryTable } from "./DispatchItemsSummaryTable";
import { isStandaloneDispatchOrderType } from "./dispatch-order-helpers";
import { Separator } from "@/components/ui/separator";
import { OrderPaymentDetailsPanel } from "@/components/orders/OrderPaymentDetailsPanel";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useListParams } from "@/hooks/use-list-params";
import {
  DataTable,
  DataTableColumn,
  DataTableFilter,
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
  MoneyCell,
  RowActionButton,
  StatusBadge,
  ItemsTable,
  TableMainCell,
} from "@/components/shared";

function clubOrderItems(lines: OrderItemData[]) {
  const map = new Map<
    number,
    { inventoryId: number; name: string; sku: string | null; quantity: number; reservedQty: number; backorderedQty: number; fulfilledQty: number }
  >();
  for (const line of lines) {
    const id = line.inventory?.id ?? -(line.id);
    const existing = map.get(id);
    if (existing) {
      existing.quantity += line.quantity;
      existing.reservedQty += line.reservedQty ?? 0;
      existing.backorderedQty += line.backorderedQty ?? 0;
      existing.fulfilledQty += line.fulfilledQty ?? 0;
    } else {
      map.set(id, {
        inventoryId: id,
        name: line.inventory?.name ?? `Item #${line.id}`,
        sku: line.inventory?.sku ?? null,
        quantity: line.quantity,
        reservedQty: line.reservedQty ?? 0,
        backorderedQty: line.backorderedQty ?? 0,
        fulfilledQty: line.fulfilledQty ?? 0,
      });
    }
  }
  return [...map.values()];
}

interface AdminOrdersTableProps {
  franchiseId?: string;
  regionAdminId?: number;
  /** Read-only oversight view (super-admin regional operations): hide the actions column. */
  readOnly?: boolean;
}

export default function AdminOrdersTable({
  franchiseId,
  regionAdminId,
  readOnly,
}: AdminOrdersTableProps) {
  // List state lives in the URL (SW-P10) — filters survive refresh/back.
  const listParams = useListParams({ filterDefaults: { status: "all" } });
  const currentPage = listParams.page;
  const search = listParams.search;
  const statusFilter = listParams.filters.status;
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [verifyDialogOrderId, setVerifyDialogOrderId] = useState<number | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<OrderData | null>(null);
  const [refundOnCancel, setRefundOnCancel] = useState(false);

  const ordersQuery = useAdminOrderRows({
    page: currentPage,
    limit: 10,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    phase: "orders",
    franchiseId,
    regionAdminId,
  });

  const rows = ordersQuery.data?.rows ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;

  const handleMarkPaid = useCallback(
    async (orderId: number) => {
      try {
        setBusyOrderId(orderId);
        await markOrderPaidAdmin(orderId);
        toast.success("Order marked as paid");
        await ordersQuery.refetch();
      } catch (error) {
        toast.error(getUserFriendlyMessage(error));
      } finally {
        setBusyOrderId(null);
      }
    },
    [ordersQuery],
  );

  const handleOpenCancelDialog = useCallback((order: OrderData) => {
    setRefundOnCancel(order.paymentStatus === "PAID");
    setCancelDialogOrder(order);
  }, []);

  const handleConfirmAdminCancel = useCallback(async () => {
    if (!cancelDialogOrder) return;
    try {
      setBusyOrderId(cancelDialogOrder.id);
      await cancelOrderAdmin(cancelDialogOrder.id, { refund: refundOnCancel });
      const paid = cancelDialogOrder.paymentStatus === "PAID";
      if (refundOnCancel && paid) {
        toast.success("Order cancelled. A refund has been submitted for this order.");
      } else {
        toast.success("Order cancelled");
      }
      await ordersQuery.refetch();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setBusyOrderId(null);
      setCancelDialogOrder(null);
    }
  }, [cancelDialogOrder, refundOnCancel, ordersQuery]);

  const handleVerifyConfirm = useCallback(
    async (data: VerifyShipmentDto) => {
      if (verifyDialogOrderId === null) return;
      const id = verifyDialogOrderId;
      try {
        setBusyOrderId(id);
        await verifyShipment(id, data);
        toast.success("Shipment verified");
        await ordersQuery.refetch();
      } catch (error) {
        toast.error(getUserFriendlyMessage(error));
      } finally {
        setBusyOrderId(null);
        setVerifyDialogOrderId(null);
      }
    },
    [verifyDialogOrderId, ordersQuery],
  );

  const handleRegenerateDc = useCallback(
    async (orderId: number) => {
      try {
        setBusyOrderId(orderId);
        const result = await regenerateDc(orderId);
        toast.success("Delivery challan regenerated");
        await ordersQuery.refetch();
        // Auto-download the freshly generated PDF
        void downloadChallan(result.dcPdfPath);
      } catch (error) {
        toast.error(getUserFriendlyMessage(error));
      } finally {
        setBusyOrderId(null);
      }
    },
    [ordersQuery],
  );

  const handleRefreshAllocation = useCallback(
    async (orderId: number) => {
      try {
        setBusyOrderId(orderId);
        const result = await refreshOrderAllocationAdmin(orderId);
        if (result.linesUpdated > 0) {
          toast.success(result.message);
        } else {
          toast.info(result.message);
        }
        await ordersQuery.refetch();
      } catch (error) {
        toast.error(getUserFriendlyMessage(error));
      } finally {
        setBusyOrderId(null);
      }
    },
    [ordersQuery],
  );

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Order Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "Pending payment", label: "Pending payment" },
        { value: "Pending allocation", label: "Pending allocation" },
        { value: "Allocated", label: "Allocated" },
        { value: "Backordered", label: "Backordered" },
        { value: "Ready to ship", label: "Ready to ship" },
        { value: "Verified", label: "Verified" },
        { value: "Shipped", label: "Shipped" },
        { value: "Delivered", label: "Delivered" },
        { value: "Cancelled", label: "Cancelled" },
      ],
      defaultValue: statusFilter,
    },
  ];

  const columns: DataTableColumn<OrderData>[] = useMemo(
    () => [
      { key: "order", header: "Order" },
      {
        key: "franchise",
        header: "Franchise",
        render: (order) => order.franchise?.name ?? order.franchise?.code ?? "—",
      },
      {
        key: "payment",
        header: "Payment",
        render: (order) => (
          <StatusBadge label={order.paymentStatus || "Unknown"} />
        ),
      },
      {
        key: "fulfillment",
        header: "Fulfillment",
        render: (order) => {
          const label = order.adminStatus || order.fulfillmentStatus || "Unknown";
          return <StatusBadge label={label} />;
        },
      },
      {
        key: "value",
        header: "Value",
        render: (order) => {
          if (isStandaloneDispatchOrderType(order.orderType)) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          const total = Number(order.totalAmount);
          const subtotal =
            order.subtotalAmount != null ? Number(order.subtotalAmount) : null;
          const gst =
            order.gstAmount != null ? Number(order.gstAmount) : null;
          const showBreakdown =
            subtotal != null && gst != null && gst > 0;
          return (
            <MoneyCell
              amount={total}
              breakdown={showBreakdown ? { subtotal, gst } : undefined}
              className="font-medium"
            />
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (order) => {
          const isFinal =
            order.adminStatus === "Cancelled" ||
            order.adminStatus === "Shipped" ||
            order.adminStatus === "Delivered";
          const isReadyToShip =
            order.adminStatus === "Ready to ship" ||
            order.fulfillmentStatus === "READY_TO_SHIP";
          const isBackordered =
            order.allocationStatus === "BACKORDERED" ||
            (order.lineItems ?? []).some(
              (line) => (line.backorderedQty ?? 0) > 0,
            );
          const busy = busyOrderId === order.id;
          const hasDc =
            !!order.shipment?.dcPdfPath && order.adminStatus !== "Cancelled";
          // Overflow items (R1): everything that isn't the read action or
          // the single top state action. Destructive item renders last.
          const canRefreshAllocation = isBackordered && !isFinal;
          const canCancel = !isFinal;
          const hasOverflow =
            !readOnly && (canRefreshAllocation || hasDc || canCancel);

          return (
            <div className="flex items-center justify-end gap-1">
              <RowActionButton
                icon={Eye}
                label="View details"
                onClick={() => setDetailOrderId(order.id)}
              />
              {/* Single inline state action: verify beats mark-as-paid. */}
              {!readOnly && isReadyToShip ? (
                <RowActionButton
                  icon={ShieldCheck}
                  label="Verify shipment"
                  busy={busy}
                  onClick={() => setVerifyDialogOrderId(order.id)}
                />
              ) : !readOnly && order.paymentStatus === "PENDING" ? (
                <RowActionButton
                  icon={CreditCard}
                  label="Mark as paid"
                  busy={busy}
                  onClick={() => void handleMarkPaid(order.id)}
                />
              ) : null}
              {hasOverflow ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0"
                      title="More actions"
                      aria-label="More actions"
                      disabled={busy}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canRefreshAllocation ? (
                      <DropdownMenuItem
                        onSelect={() => void handleRefreshAllocation(order.id)}
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Refresh allocation
                      </DropdownMenuItem>
                    ) : null}
                    {hasDc ? (
                      <DropdownMenuItem
                        onSelect={() =>
                          void downloadChallan(order.shipment!.dcPdfPath!)
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download delivery challan
                      </DropdownMenuItem>
                    ) : null}
                    {hasDc ? (
                      <DropdownMenuItem
                        onSelect={() => void handleRegenerateDc(order.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate delivery challan
                      </DropdownMenuItem>
                    ) : null}
                    {canCancel ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => handleOpenCancelDialog(order)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel order
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        },
      },
    ],
    [busyOrderId, handleMarkPaid, handleOpenCancelDialog, handleRegenerateDc, handleRefreshAllocation, setVerifyDialogOrderId, readOnly],
  );

  return (
    <>
    <DataTable<OrderData>
      data={rows}
      loading={ordersQuery.isLoading}
      columns={columns}
      getRowId={(order) => String(order.id)}
      renderMainCell={(order) => (
        <TableMainCell title={order.referenceId || `Order #${order.id}`} />
      )}
      renderExpandedContent={(order) => {
        const standalone = isStandaloneDispatchOrderType(order.orderType);
        const hasDispatch = (order.dispatchItems?.length ?? 0) > 0;
        const inventoryLines = clubOrderItems(order.lineItems ?? []);
        const hasInventory = inventoryLines.length > 0;

        const dispatch = order.dispatchItems ?? [];
        const certCount = dispatch.filter((d) => d.itemType === "CERTIFICATE").length;
        const idCount = dispatch.filter((d) => d.itemType === "ID_CARD").length;
        const materialQty = (order.lineItems ?? []).reduce((s, l) => s + l.quantity, 0);

        return (
        <>
          <ExpandedDetailSection title={`Order #${order.id}`}>
            <DetailFieldsGrid columns={4}>
              <DetailField
                label="Order date"
                value={new Date(order.createdAt).toLocaleString()}
              />
              <DetailField label="Status" value={order.adminStatus ?? order.status} />
              <DetailField
                label="Allocation"
                value={
                  <>
                    {order.allocationStatus || "Unknown"}
                    {order.backorderedAt
                      ? ` · backordered ${formatDate(order.backorderedAt)}`
                      : ""}
                  </>
                }
              />
              {standalone ? null : (
                <DetailField
                  label="Total amount"
                  value={formatRupees(Number(order.totalAmount))}
                />
              )}
              <DetailField
                label="Franchise"
                value={order.franchise?.name ?? order.franchise?.code ?? "—"}
              />
              <DetailField
                label="Students"
                value={order.totalStudents == null ? "—" : String(order.totalStudents)}
              />
              <DetailField label="Inventory qty" value={String(materialQty)} />
              <DetailField
                label="Certificates / IDs"
                value={`${certCount} cert · ${idCount} ID`}
              />
              {order.referenceId ? (
                <DetailField label="Payment ref" value={order.referenceId} span={2} mono />
              ) : null}
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          {hasDispatch ? (
            <>
              <Separator />
              <ExpandedDetailSection title="Certificate & ID dispatch">
                <DispatchItemsSummaryTable items={order.dispatchItems ?? []} />
              </ExpandedDetailSection>
            </>
          ) : null}

          <Separator />

          <ExpandedDetailSection title="Order details">
            <DetailFieldsGrid columns={4}>
              <DetailField label="Order type" value={orderTypeLabel(order.orderType)} />
              <DetailField
                label="Ready to ship"
                value={
                  order.readyToShipAt
                    ? new Date(order.readyToShipAt).toLocaleString()
                    : "Not yet"
                }
              />
              <DetailField label="Notes" value={order.notes || "None"} />
              <DetailField
                label="Shipment"
                value={order.shipment?.status || "Not created"}
              />
              <DetailField
                label="DC Challan"
                value={
                  order.shipment?.dcPdfPath && order.adminStatus !== "Cancelled" ? (
                    <DcDownload
                      variant="link"
                      label="Download"
                      onClick={() => void downloadChallan(order.shipment!.dcPdfPath!)}
                    />
                  ) : (
                    "Not generated"
                  )
                }
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          {hasInventory ? (
            <>
              <Separator />
              <ExpandedDetailSection title="Inventory">
                <ItemsTable
                  columns={[
                    {
                      key: "item",
                      header: "Item",
                      render: (line) => (
                        <>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {line.sku || "No SKU"}
                          </div>
                        </>
                      ),
                    },
                    { key: "quantity", header: "Ordered" },
                    { key: "reservedQty", header: "Reserved" },
                    { key: "backorderedQty", header: "Backordered" },
                    { key: "fulfilledQty", header: "Fulfilled" },
                  ]}
                  rows={inventoryLines}
                />
              </ExpandedDetailSection>
            </>
          ) : null}
          {order.payment != null ? (
            <>
              <Separator />
              <ExpandedDetailSection title="Payment">
                <OrderPaymentDetailsPanel
                  payment={order.payment}
                  hideTitle
                  className="border-0 bg-transparent p-0"
                  fallbackGoodsGstAmount={order.gstAmount ?? null}
                />
              </ExpandedDetailSection>
            </>
          ) : null}
        </>
        );
      }}
      initialSearchValue={search}
      searchPlaceholder="Search by order, franchise, or status"
      onSearchChange={(s) => {
        listParams.setSearch(s);
      }}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") {
          listParams.setFilter("status", value as string);
        }
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={listParams.setPage}
      itemsPerPage={10}
      error={ordersQuery.error}
      onRetry={() => void ordersQuery.refetch()}
      errorMessage="Couldn't load orders."
      emptyMessage="No orders match the current filters."
      resultsText={(count, tot) =>
        `Showing ${count} of ${tot} order${tot !== 1 ? "s" : ""}`
      }
    />

    <AdminOrderInvoiceDialog
      orderId={detailOrderId}
      onClose={() => setDetailOrderId(null)}
    />

    <VerifyShipmentDialog
      open={verifyDialogOrderId !== null}
      onOpenChange={(open) => { if (!open) setVerifyDialogOrderId(null); }}
      onConfirm={handleVerifyConfirm}
      busy={busyOrderId !== null}
    />

    <FormDialog
      open={cancelDialogOrder !== null}
      onOpenChange={(open) => {
        if (!open) setCancelDialogOrder(null);
      }}
      title="Cancel order"
      description={
        <>
          Order{" "}
          <span className="font-medium text-foreground">
            #{cancelDialogOrder?.id}
          </span>
          {cancelDialogOrder?.referenceId ? (
            <> · {cancelDialogOrder.referenceId}</>
          ) : null}{" "}
          will be cancelled and cannot be restored.
        </>
      }
      formId="admin-cancel-order-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirmAdminCancel();
      }}
      isSubmitting={
        cancelDialogOrder != null && busyOrderId === cancelDialogOrder.id
      }
      submitLabel="Cancel order"
      cancelLabel="Keep order"
      size="md"
    >
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Checkbox
          id="admin-cancel-refund"
          checked={refundOnCancel}
          disabled={
            cancelDialogOrder != null && busyOrderId === cancelDialogOrder.id
          }
          onCheckedChange={(v) => setRefundOnCancel(v === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="admin-cancel-refund" className="cursor-pointer font-medium">
            Refund payment to customer
          </Label>
          <p className="text-sm text-muted-foreground">
            For paid orders, submits a full refund. Clear this option to cancel the order
            without a refund.
          </p>
        </div>
      </div>
    </FormDialog>
    </>
  );
}
