"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Truck, PackageCheck, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";
import type { OrderData } from "@/services/order.service";
import {
  cancelShipment,
  deliverShipment,
  downloadChallan,
  shipShipment,
  verifyShipment,
} from "@/services/fulfillment.service";
import {
  DataTable,
  DataTableColumn,
  DataTableFilter,
  RawTableSurface,
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
} from "@/components/shared";
import { VerifyShipmentDialog } from "./VerifyShipmentDialog";
import { ShipShipmentDialog } from "./ShipShipmentDialog";
import type { VerifyShipmentDto, ShipShipmentDto } from "@/services/fulfillment.service";

export default function AdminShippingTable() {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [verifyDialogOrderId, setVerifyDialogOrderId] = useState<number | null>(null);
  const [shipDialogOrderId, setShipDialogOrderId] = useState<number | null>(null);

  const shippingQuery = useAdminOrderRows({
    page: currentPage,
    limit: 10,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    phase: "shipping",
  });

  const rows = shippingQuery.data?.rows ?? [];
  const total = shippingQuery.data?.total ?? 0;
  const totalPages = shippingQuery.data?.totalPages ?? 1;

  const runAction = useCallback(
    async (orderId: number, action: () => Promise<unknown>, success: string) => {
      try {
        setBusyOrderId(orderId);
        await action();
        toast({ title: success });
        await shippingQuery.refetch();
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
    [shippingQuery, toast],
  );

  const handleVerifyConfirm = useCallback(
    async (data: VerifyShipmentDto) => {
      if (verifyDialogOrderId === null) return;
      const id = verifyDialogOrderId;
      await runAction(id, () => verifyShipment(id, data), "Shipment verified");
      setVerifyDialogOrderId(null);
    },
    [verifyDialogOrderId, runAction],
  );

  const handleShipConfirm = useCallback(
    async (data: ShipShipmentDto) => {
      if (shipDialogOrderId === null) return;
      const id = shipDialogOrderId;
      await runAction(id, () => shipShipment(id, data), "Shipment marked as shipped");
      setShipDialogOrderId(null);
    },
    [shipDialogOrderId, runAction],
  );

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Shipment Status",
      options: [
        { value: "all", label: "All statuses" },
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
              {order.totalItems ?? 0} items
            </div>
          </div>
        ),
      },
      {
        key: "shipment",
        header: "Shipment",
        render: (order) => {
          const s = order.shipment?.status || order.adminStatus || "Unknown";
          return (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {s}
            </Badge>
          );
        },
      },
      {
        key: "tracking",
        header: "Tracking",
        render: (order) => (
          <div>
            <div>{order.shipment?.trackingNumber || "Not assigned"}</div>
            <div className="text-xs text-muted-foreground">
              {order.shipment?.carrier || "No carrier"}
            </div>
          </div>
        ),
      },
      {
        key: "readyAt",
        header: "Ready at",
        render: (order) =>
          order.readyToShipAt
            ? new Date(order.readyToShipAt).toLocaleString()
            : "Waiting",
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-center",
        render: (order) => {
          const shipmentStatus =
            order.shipment?.status || order.adminStatus || "Unknown";
          const isReadyToShip =
            order.adminStatus === "Ready to ship" ||
            order.fulfillmentStatus === "READY_TO_SHIP";
          const isVerified =
            order.shipment?.status === "VERIFIED" ||
            order.adminStatus === "Verified" ||
            order.fulfillmentStatus === "VERIFIED";
          const isShipped =
            order.shipment?.status === "SHIPPED" ||
            order.adminStatus === "Shipped" ||
            order.fulfillmentStatus === "SHIPPED";
          const isDone =
            shipmentStatus === "Delivered" ||
            shipmentStatus === "DELIVERED" ||
            shipmentStatus === "Cancelled" ||
            shipmentStatus === "CANCELLED";
          const isCancelled =
            shipmentStatus === "Cancelled" || shipmentStatus === "CANCELLED";

          return (
            <div className="flex items-center justify-center gap-1">
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
              {isVerified ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Mark as shipped"
                  disabled={busyOrderId === order.id}
                  onClick={() => setShipDialogOrderId(order.id)}
                >
                  <Truck className="h-4 w-4" />
                </Button>
              ) : null}
              {isShipped ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Mark as delivered"
                  disabled={busyOrderId === order.id}
                  onClick={() =>
                    void runAction(
                      order.id,
                      () => deliverShipment(order.id),
                      "Shipment delivered",
                    )
                  }
                >
                  <PackageCheck className="h-4 w-4" />
                </Button>
              ) : null}
              {order.shipment?.dcPdfPath && !isCancelled ? (
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
              {!isDone ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Cancel shipment"
                  disabled={busyOrderId === order.id}
                  onClick={() =>
                    void runAction(
                      order.id,
                      () => cancelShipment(order.id),
                      "Shipment cancelled",
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [busyOrderId, runAction, setShipDialogOrderId, setVerifyDialogOrderId],
  );

  return (
    <>
    <DataTable<OrderData>
      data={rows}
      loading={shippingQuery.isLoading}
      columns={columns}
      getRowId={(order) => String(order.id)}
      renderMainCell={(order) => (
        <div>
          <div className="font-medium">
            {order.referenceId || `Order #${order.id}`}
          </div>
          <div className="text-xs text-muted-foreground">
            ₹{Number(order.totalAmount).toFixed(2)}
          </div>
        </div>
      )}
      renderExpandedContent={(order) => (
        <ExpandedDetailSection title="Shipment details">
          <div className="space-y-4">
            <DetailFieldsGrid columns={4}>
              <DetailField
                label="Shipment status"
                value={order.shipment?.status || order.adminStatus || "Unknown"}
              />
              <DetailField
                label="Carrier"
                value={order.shipment?.carrier || "Not set"}
              />
              <DetailField
                label="Tracking"
                value={order.shipment?.trackingNumber || "Not set"}
              />
              <DetailField
                label="DC Challan"
                value={(() => {
                  const s = order.shipment?.status || order.adminStatus || "";
                  const cancelled = s === "Cancelled" || s === "CANCELLED";
                  return order.shipment?.dcPdfPath && !cancelled ? (
                    <button
                      className="flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-75"
                      onClick={() => void downloadChallan(order.shipment!.dcPdfPath!)}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  ) : (
                    "Not generated"
                  );
                })()}
              />
            </DetailFieldsGrid>

            <RawTableSurface>
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Reserved</th>
                    <th className="px-3 py-2 text-left">Fulfilled</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.lineItems ?? []).map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {line.inventory?.name ?? `Item #${line.id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {line.inventory?.sku || "No SKU"}
                        </div>
                      </td>
                      <td className="px-3 py-2">{line.reservedQty ?? 0}</td>
                      <td className="px-3 py-2">{line.fulfilledQty ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </RawTableSurface>
          </div>
        </ExpandedDetailSection>
      )}
      searchPlaceholder="Search by order, franchise, or shipment"
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
      emptyMessage="No full-shipment-ready orders found."
      resultsText={(count, tot) =>
        `Showing ${count} of ${tot} shipment${tot !== 1 ? "s" : ""}`
      }
    />

    <VerifyShipmentDialog
      open={verifyDialogOrderId !== null}
      onOpenChange={(open) => { if (!open) setVerifyDialogOrderId(null); }}
      onConfirm={handleVerifyConfirm}
      busy={busyOrderId !== null}
    />
    <ShipShipmentDialog
      open={shipDialogOrderId !== null}
      onOpenChange={(open) => { if (!open) setShipDialogOrderId(null); }}
      onConfirm={handleShipConfirm}
      busy={busyOrderId !== null}
    />
    </>
  );
}
