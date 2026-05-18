"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, PackageCheck, X, Download } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { useAdminShipments } from "@/hooks/api/fulfillment.hooks";
import type { ShipmentData } from "@/services/fulfillment.service";
import {
  cancelShipment,
  deliverShipment,
  downloadChallan,
  shipShipment,
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
import { Separator } from "@/components/ui/separator";
import { ShipShipmentDialog } from "./ShipShipmentDialog";
import { DispatchItemsSummaryTable } from "@/app/admin/orders/components/DispatchItemsSummaryTable";
import type { ShipShipmentDto } from "@/services/fulfillment.service";

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function AdminShippingTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [shipDialogOrderId, setShipDialogOrderId] = useState<number | null>(null);

  const shipmentsQuery = useAdminShipments({
    page: currentPage,
    limit: 10,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const rows = shipmentsQuery.data?.rows ?? [];
  const total = shipmentsQuery.data?.total ?? 0;
  const totalPages = shipmentsQuery.data?.totalPages ?? 1;

  const shipDialogTrackingSeed = useMemo(() => {
    if (shipDialogOrderId === null) return null;
    const row = rows.find((r) => r.orderId === shipDialogOrderId);
    return {
      orderId: shipDialogOrderId,
      tracking: row?.trackingNumber ?? null,
      carrier: row?.carrier ?? null,
    };
  }, [shipDialogOrderId, rows]);

  const runAction = useCallback(
    async (orderId: number, action: () => Promise<unknown>, success: string) => {
      try {
        setBusyOrderId(orderId);
        await action();
        toast.success(success);
        await shipmentsQuery.refetch();
      } catch (error) {
        toast.error(getUserFriendlyMessage(error));
      } finally {
        setBusyOrderId(null);
      }
    },
    [shipmentsQuery],
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
        { value: "VERIFIED", label: "Verified" },
        { value: "SHIPPED", label: "Shipped" },
        { value: "DELIVERED", label: "Delivered" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
      defaultValue: "all",
    },
  ];

  const columns: DataTableColumn<ShipmentData>[] = useMemo(
    () => [
      { key: "order", header: "Order" },
      {
        key: "franchise",
        header: "Franchise",
        render: (row) => {
          const dispatch = row.dispatchItems ?? [];
          const certCount = dispatch.filter((d) => d.itemType === "CERTIFICATE").length;
          const idCount = dispatch.filter((d) => d.itemType === "ID_CARD").length;
          const materialQty = (row.orderItems ?? []).reduce((s, l) => s + l.quantity, 0);
          return (
          <div>
            <div className="font-medium">
              {row.franchise?.name ?? row.franchiseId}
            </div>
            <div className="text-xs text-muted-foreground">
              {materialQty} inventory qty
              {certCount > 0
                ? ` · ${certCount} certificate${certCount === 1 ? "" : "s"}`
                : ""}
              {idCount > 0 ? ` · ${idCount} ID card${idCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
          );
        },
      },
      {
        key: "shipment",
        header: "Shipment",
        render: (row) => (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {STATUS_LABEL[row.status] ?? row.status}
          </Badge>
        ),
      },
      {
        key: "tracking",
        header: "Tracking",
        render: (row) => (
          <div>
            <div>{row.trackingNumber || "Not assigned"}</div>
            <div className="text-xs text-muted-foreground">
              {row.carrier || "No carrier"}
            </div>
          </div>
        ),
      },
      {
        key: "readyAt",
        header: "Ready at",
        render: (row) =>
          row.readyToShipAt
            ? new Date(row.readyToShipAt).toLocaleString()
            : "Waiting",
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-center",
        render: (row) => {
          const isVerified = row.status === "VERIFIED";
          const isShipped = row.status === "SHIPPED";
          const isDone = row.status === "DELIVERED" || row.status === "CANCELLED";
          const isCancelled = row.status === "CANCELLED";

          return (
            <div className="flex items-center justify-center gap-1">
              {isVerified ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Mark as shipped"
                  disabled={busyOrderId === row.orderId}
                  onClick={() => setShipDialogOrderId(row.orderId)}
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
                  disabled={busyOrderId === row.orderId}
                  onClick={() =>
                    void runAction(
                      row.orderId,
                      () => deliverShipment(row.orderId),
                      "Shipment delivered",
                    )
                  }
                >
                  <PackageCheck className="h-4 w-4" />
                </Button>
              ) : null}
              {row.dcPdfPath && !isCancelled ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  title="Download delivery challan"
                  onClick={() => void downloadChallan(row.dcPdfPath!)}
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
                  disabled={busyOrderId === row.orderId}
                  onClick={() =>
                    void runAction(
                      row.orderId,
                      () => cancelShipment(row.orderId),
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
    [busyOrderId, runAction, setShipDialogOrderId],
  );

  return (
    <>
      <DataTable<ShipmentData>
        data={rows}
        loading={shipmentsQuery.isLoading}
        columns={columns}
        getRowId={(row) => String(row.id)}
        renderMainCell={(row) => {
          const dispatchOnly =
            (row.orderItems?.length ?? 0) === 0 && (row.dispatchItems?.length ?? 0) > 0;
          return (
          <div>
            <div className="font-medium">
              {row.referenceId}
            </div>
            {dispatchOnly ? (
              <div className="text-xs text-muted-foreground">Dispatch only (no material charge)</div>
            ) : (
              <div className="text-xs text-muted-foreground">
                ₹{Number(row.totalAmount).toFixed(2)}
              </div>
            )}
          </div>
          );
        }}
        renderExpandedContent={(row) => (
          <ExpandedDetailSection title="Shipment details">
            <div className="space-y-4">
              <DetailFieldsGrid columns={4}>
                <DetailField
                  label="Shipment status"
                  value={STATUS_LABEL[row.status] ?? row.status}
                />
                <DetailField
                  label="Carrier"
                  value={row.carrier || "Not set"}
                />
                <DetailField
                  label="Tracking"
                  value={row.trackingNumber || "Not set"}
                />
                <DetailField
                  label="DC Challan"
                  value={(() => {
                    const cancelled = row.status === "CANCELLED";
                    return row.dcPdfPath && !cancelled ? (
                      <button
                        className="flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-75"
                        onClick={() => void downloadChallan(row.dcPdfPath!)}
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

              {(row.dispatchItems?.length ?? 0) > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Certificate &amp; ID dispatch
                    </h3>
                    <DispatchItemsSummaryTable items={row.dispatchItems ?? []} />
                  </div>
                </>
              ) : null}

              {(row.orderItems?.length ?? 0) > 0 ? (
                <>
                  {(row.dispatchItems?.length ?? 0) > 0 ? <Separator /> : null}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Inventory</h3>
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
                        {(row.orderItems ?? []).map((line) => (
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
                </>
              ) : null}
            </div>
          </ExpandedDetailSection>
        )}
        searchPlaceholder="Search by order, franchise, or tracking"
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
        emptyMessage="No shipments found."
        resultsText={(count, tot) =>
          `Showing ${count} of ${tot} shipment${tot !== 1 ? "s" : ""}`
        }
      />

      <ShipShipmentDialog
        open={shipDialogOrderId !== null}
        onOpenChange={(open) => { if (!open) setShipDialogOrderId(null); }}
        onConfirm={handleShipConfirm}
        busy={busyOrderId !== null}
        shipmentTrackingSeed={shipDialogTrackingSeed}
      />
    </>
  );
}
