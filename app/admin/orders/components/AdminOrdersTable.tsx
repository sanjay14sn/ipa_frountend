"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, ShieldCheck, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  cancelOrderAdmin,
  markOrderPaidAdmin,
  type OrderData,
  type OrderItemData,
} from "@/services/order.service";
import { verifyShipment, downloadChallan, type VerifyShipmentDto } from "@/services/fulfillment.service";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";
import { VerifyShipmentDialog } from "@/app/admin/shipping/components/VerifyShipmentDialog";
import { OrderBreakdownDialog } from "./OrderBreakdownDialog";
import {
  DataTable,
  DataTableColumn,
  DataTableFilter,
  RawTableSurface,
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
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
}

export default function AdminOrdersTable({
  franchiseId,
}: AdminOrdersTableProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [verifyDialogOrderId, setVerifyDialogOrderId] = useState<number | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);

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
        toast({ title: "Order marked as paid" });
        await ordersQuery.refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: getUserFriendlyMessage(error),
          variant: "destructive",
        });
      } finally {
        setBusyOrderId(null);
      }
    },
    [ordersQuery, toast],
  );

  const handleCancel = useCallback(
    async (orderId: number) => {
      try {
        setBusyOrderId(orderId);
        await cancelOrderAdmin(orderId);
        toast({ title: "Order cancelled" });
        await ordersQuery.refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: getUserFriendlyMessage(error),
          variant: "destructive",
        });
      } finally {
        setBusyOrderId(null);
      }
    },
    [ordersQuery, toast],
  );

  const handleVerifyConfirm = useCallback(
    async (data: VerifyShipmentDto) => {
      if (verifyDialogOrderId === null) return;
      const id = verifyDialogOrderId;
      try {
        setBusyOrderId(id);
        await verifyShipment(id, data);
        toast({ title: "Shipment verified" });
        await ordersQuery.refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: getUserFriendlyMessage(error),
          variant: "destructive",
        });
      } finally {
        setBusyOrderId(null);
        setVerifyDialogOrderId(null);
      }
    },
    [verifyDialogOrderId, ordersQuery, toast],
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
        render: (order) => (
          <div>
            <div className="font-medium">
              {order.franchise?.name ?? order.franchiseId}
            </div>
            <div className="text-xs text-muted-foreground">
              {order.totalStudents ?? 0} students · {order.totalItems ?? 0} items
            </div>
          </div>
        ),
      },
      {
        key: "payment",
        header: "Payment",
        render: (order) => (
          <Badge variant="secondary">{order.paymentStatus || "Unknown"}</Badge>
        ),
      },
      {
        key: "allocation",
        header: "Allocation",
        render: (order) => (
          <div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {order.allocationStatus || "Unknown"}
            </Badge>
            {order.backorderedAt ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Backordered {new Date(order.backorderedAt).toLocaleDateString()}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "fulfillment",
        header: "Fulfillment",
        render: (order) => (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            {order.adminStatus || order.fulfillmentStatus || "Unknown"}
          </Badge>
        ),
      },
      {
        key: "value",
        header: "Value",
        render: (order) => (
          <span className="font-medium">
            ₹{Number(order.totalAmount).toFixed(2)}
          </span>
        ),
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
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                title="View details"
                onClick={() => setDetailOrderId(order.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {order.paymentStatus === "PENDING" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Mark as paid"
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
                  onClick={() => void downloadChallan(order.shipment!.dcPdfPath!)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
              {!isFinal ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Cancel order"
                  disabled={busyOrderId === order.id}
                  onClick={() => void handleCancel(order.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [busyOrderId, handleMarkPaid, handleCancel, setVerifyDialogOrderId],
  );

  return (
    <>
    <DataTable<OrderData>
      data={rows}
      loading={ordersQuery.isLoading}
      columns={columns}
      getRowId={(order) => String(order.id)}
      renderMainCell={(order) => (
        <div>
          <div className="font-medium">
            {order.referenceId || `Order #${order.id}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
      )}
      renderExpandedContent={(order) => (
        <ExpandedDetailSection title="Order details">
          <div className="space-y-4">
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
                  {clubOrderItems(order.lineItems ?? []).map((line) => (
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
          </div>
        </ExpandedDetailSection>
      )}
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

    <OrderBreakdownDialog
      orderId={detailOrderId}
      onClose={() => setDetailOrderId(null)}
    />

    <VerifyShipmentDialog
      open={verifyDialogOrderId !== null}
      onOpenChange={(open) => { if (!open) setVerifyDialogOrderId(null); }}
      onConfirm={handleVerifyConfirm}
      busy={busyOrderId !== null}
    />
    </>
  );
}
