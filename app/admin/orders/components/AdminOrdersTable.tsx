"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, ShieldCheck, X, Download, Loader2, RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  cancelOrderAdmin,
  markOrderPaidAdmin,
  refreshOrderAllocationAdmin,
  type OrderData,
  type OrderItemData,
} from "@/services/order.service";
import { verifyShipment, downloadChallan, regenerateDc, type VerifyShipmentDto } from "@/services/fulfillment.service";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";
import { VerifyShipmentDialog } from "@/app/admin/shipping/components/VerifyShipmentDialog";
import { AdminOrderInvoiceDialog } from "./AdminOrderInvoiceDialog";
import { DispatchItemsSummaryTable } from "./DispatchItemsSummaryTable";
import { isStandaloneDispatchOrderType } from "./dispatch-order-helpers";
import { Separator } from "@/components/ui/separator";
import { OrderPaymentDetailsPanel } from "@/components/orders/OrderPaymentDetailsPanel";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableColumn,
  DataTableFilter,
  RawTableSurface,
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";

function paymentTone(status: string | null | undefined): StatusTone {
  switch ((status ?? "").toUpperCase()) {
    case "PAID":
      return "success";
    case "PENDING":
    case "PARTIAL":
      return "warning";
    case "FAILED":
      return "destructive";
    case "REFUNDED":
      return "neutral";
    default:
      return "neutral";
  }
}

function fulfillmentTone(status: string | null | undefined): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "verified":
    case "delivered":
      return "success";
    case "shipped":
    case "ready to ship":
      return "info";
    case "pending":
      return "warning";
    case "cancelled":
    case "canceled":
      return "destructive";
    default:
      return "neutral";
  }
}

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
}

export default function AdminOrdersTable({
  franchiseId,
}: AdminOrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      defaultValue: "all",
    },
  ];

  const columns: DataTableColumn<OrderData>[] = useMemo(
    () => [
      { key: "order", header: "Order" },
      {
        key: "franchise",
        header: "Franchise",
        render: (order) => order.franchise?.name ?? order.franchiseId ?? "—",
      },
      {
        key: "payment",
        header: "Payment",
        render: (order) => (
          <StatusBadge
            tone={paymentTone(order.paymentStatus)}
            label={order.paymentStatus || "Unknown"}
          />
        ),
      },
      {
        key: "fulfillment",
        header: "Fulfillment",
        render: (order) => {
          const label = order.adminStatus || order.fulfillmentStatus || "Unknown";
          return <StatusBadge tone={fulfillmentTone(label)} label={label} />;
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
            <span
              className="font-medium"
              title={
                showBreakdown
                  ? `Subtotal ₹${subtotal.toFixed(2)} + GST ₹${gst.toFixed(2)} = Total ₹${total.toFixed(2)}`
                  : undefined
              }
            >
              ₹{total.toFixed(2)}
            </span>
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
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                title="View details"
                aria-label="View details"
                onClick={() => setDetailOrderId(order.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {isBackordered && !isFinal ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Refresh allocation (reconcile backordered items against current inventory)"
                  aria-label="Refresh allocation"
                  disabled={busyOrderId === order.id}
                  onClick={() => void handleRefreshAllocation(order.id)}
                >
                  {busyOrderId === order.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
              {order.paymentStatus === "PENDING" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Mark as paid"
                  aria-label="Mark as paid"
                  disabled={busyOrderId === order.id}
                  onClick={() => void handleMarkPaid(order.id)}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              ) : null}
              {isReadyToShip ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Verify shipment"
                  aria-label="Verify shipment"
                  disabled={busyOrderId === order.id}
                  onClick={() => setVerifyDialogOrderId(order.id)}
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              ) : null}
              {order.shipment?.dcPdfPath && order.adminStatus !== "Cancelled" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Download delivery challan"
                  aria-label="Download delivery challan"
                  onClick={() => void downloadChallan(order.shipment!.dcPdfPath!)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
              {order.shipment?.dcPdfPath && order.adminStatus !== "Cancelled" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Regenerate delivery challan"
                  aria-label="Regenerate delivery challan"
                  disabled={busyOrderId === order.id}
                  onClick={() => void handleRegenerateDc(order.id)}
                >
                  {busyOrderId === order.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
              {!isFinal ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Cancel order"
                  aria-label="Cancel order"
                  disabled={busyOrderId === order.id}
                  onClick={() => handleOpenCancelDialog(order)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [busyOrderId, handleMarkPaid, handleOpenCancelDialog, handleRegenerateDc, handleRefreshAllocation, setVerifyDialogOrderId],
  );

  return (
    <>
    <DataTable<OrderData>
      data={rows}
      loading={ordersQuery.isLoading}
      columns={columns}
      getRowId={(order) => String(order.id)}
      renderMainCell={(order) => (
        <span className="font-medium">
          {order.referenceId || `Order #${order.id}`}
        </span>
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
                      ? ` · backordered ${new Date(order.backorderedAt).toLocaleDateString()}`
                      : ""}
                  </>
                }
              />
              {standalone ? null : (
                <DetailField
                  label="Total amount"
                  value={`₹${Number(order.totalAmount).toFixed(2)}`}
                />
              )}
              <DetailField
                label="Franchise"
                value={order.franchise?.name ?? String(order.franchiseId ?? "—")}
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
                <DetailField label="Payment ref" value={order.referenceId} span={2} />
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
              <DetailField label="Order type" value={order.orderType} />
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
                    <button
                      className="flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-75"
                      onClick={() => void downloadChallan(order.shipment!.dcPdfPath!)}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
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
                <RawTableSurface>
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Ordered</th>
                        <th className="px-3 py-2 text-left">Reserved</th>
                        <th className="px-3 py-2 text-left">Backordered</th>
                        <th className="px-3 py-2 text-left">Fulfilled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryLines.map((line) => (
                        <tr key={line.inventoryId} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium">{line.name}</div>
                            <div className="text-xs text-muted-foreground">{line.sku || "No SKU"}</div>
                          </td>
                          <td className="px-3 py-2">{line.quantity}</td>
                          <td className="px-3 py-2">{line.reservedQty}</td>
                          <td className="px-3 py-2">{line.backorderedQty}</td>
                          <td className="px-3 py-2">{line.fulfilledQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </RawTableSurface>
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
      searchPlaceholder="Search by order, franchise, or status"
      onSearchChange={(s) => {
        setSearch(s);
        setCurrentPage(1);
      }}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") {
          setStatusFilter(value as string);
          setCurrentPage(1);
        }
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={10}
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

    <AlertDialog
      open={cancelDialogOrder !== null}
      onOpenChange={(open) => {
        if (!open) setCancelDialogOrder(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel order</AlertDialogTitle>
          <AlertDialogDescription>
            Order{" "}
            <span className="font-medium text-foreground">
              #{cancelDialogOrder?.id}
            </span>
            {cancelDialogOrder?.referenceId ? (
              <> · {cancelDialogOrder.referenceId}</>
            ) : null}{" "}
            will be cancelled and cannot be restored.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={
              cancelDialogOrder != null && busyOrderId === cancelDialogOrder.id
            }
          >
            Keep order
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={
              cancelDialogOrder != null && busyOrderId === cancelDialogOrder.id
            }
            onClick={(e) => {
              e.preventDefault();
              void handleConfirmAdminCancel();
            }}
          >
            {cancelDialogOrder != null && busyOrderId === cancelDialogOrder.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
