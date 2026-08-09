"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Truck, PackageCheck, X, Download } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { formatRupees } from "@/lib/currency-utils";
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
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
  StatusBadge,
  resolveStatusTone,
  ItemsTable,
  DetailSubheading,
} from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/dialog";
import { ShipShipmentDialog } from "./ShipShipmentDialog";
import { DispatchItemsSummaryTable } from "@/components/orders/DispatchItemsSummaryTable";
import type { ShipShipmentDto } from "@/services/fulfillment.service";
import { useListParams } from "@/hooks/use-list-params";

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

interface AdminShippingTableProps {
  regionAdminId?: number;
  /** Read-only oversight view (super-admin regional operations): hide the actions column. */
  readOnly?: boolean;
}

export default function AdminShippingTable({
  regionAdminId,
  readOnly,
}: AdminShippingTableProps = {}) {
  // List state lives in the URL (SW-P10) — filters survive refresh/back.
  const listParams = useListParams({ filterDefaults: { status: "all" } });
  const currentPage = listParams.page;
  const search = listParams.search;
  const statusFilter = listParams.filters.status;
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [shipDialogOrderId, setShipDialogOrderId] = useState<number | null>(null);
  const [cancelDialogOrderId, setCancelDialogOrderId] = useState<number | null>(null);

  const shipmentsQuery = useAdminShipments({
    page: currentPage,
    limit: 10,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    regionAdminId,
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
      defaultValue: statusFilter,
    },
  ];

  const columns: DataTableColumn<ShipmentData>[] = useMemo(() => {
    const cols: DataTableColumn<ShipmentData>[] = [
      { key: "order", header: "Order" },
      {
        key: "franchise",
        header: "Franchise",
        render: (row) => row.franchise?.name ?? row.franchise?.code ?? "—",
      },
      {
        key: "shipment",
        header: "Status",
        render: (row) => (
          <StatusBadge
            tone={resolveStatusTone(STATUS_LABEL[row.status] ?? row.status, {
              verified: "info",
            })}
            label={STATUS_LABEL[row.status] ?? row.status}
          />
        ),
      },
      {
        key: "tracking",
        header: "Tracking",
        render: (row) => row.trackingNumber || "—",
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
                  aria-label="Mark as shipped"
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
                  aria-label="Mark as delivered"
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
                  aria-label="Download delivery challan"
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
                  aria-label="Cancel shipment"
                  disabled={busyOrderId === row.orderId}
                  onClick={() => setCancelDialogOrderId(row.orderId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ];
    return cols.filter((column) => !readOnly || column.key !== "actions");
  }, [busyOrderId, runAction, setShipDialogOrderId, readOnly]);

  return (
    <>
      <DataTable<ShipmentData>
        data={rows}
        loading={shipmentsQuery.isLoading}
        columns={columns}
        getRowId={(row) => String(row.id)}
        renderMainCell={(row) => (
          <span className="font-medium">{row.referenceId}</span>
        )}
        renderExpandedContent={(row) => {
          const dispatch = row.dispatchItems ?? [];
          const certCount = dispatch.filter((d) => d.itemType === "CERTIFICATE").length;
          const idCount = dispatch.filter((d) => d.itemType === "ID_CARD").length;
          const materialQty = (row.orderItems ?? []).reduce((s, l) => s + l.quantity, 0);
          const dispatchOnly =
            (row.orderItems?.length ?? 0) === 0 && (row.dispatchItems?.length ?? 0) > 0;
          return (
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
                <DetailField
                  label="Value"
                  value={
                    dispatchOnly
                      ? "Dispatch only"
                      : formatRupees(Number(row.totalAmount))
                  }
                />
                <DetailField
                  label="Ready at"
                  value={
                    row.readyToShipAt
                      ? new Date(row.readyToShipAt).toLocaleString()
                      : "Waiting"
                  }
                />
                <DetailField label="Inventory qty" value={String(materialQty)} />
                <DetailField
                  label="Certs / IDs"
                  value={`${certCount} cert · ${idCount} ID`}
                />
              </DetailFieldsGrid>

              {(row.dispatchItems?.length ?? 0) > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <DetailSubheading>Certificate &amp; ID dispatch</DetailSubheading>
                    <DispatchItemsSummaryTable items={row.dispatchItems ?? []} />
                  </div>
                </>
              ) : null}

              {(row.orderItems?.length ?? 0) > 0 ? (
                <>
                  {(row.dispatchItems?.length ?? 0) > 0 ? <Separator /> : null}
                  <div className="space-y-2">
                    <DetailSubheading>Inventory</DetailSubheading>
                    <ItemsTable
                      columns={[
                        {
                          key: "item",
                          header: "Item",
                          render: (line) => (
                            <>
                              <div className="font-medium">
                                {line.inventory?.name ?? line.inventory?.sku ?? "Unnamed item"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {line.inventory?.sku || "No SKU"}
                              </div>
                            </>
                          ),
                        },
                        {
                          key: "reserved",
                          header: "Reserved",
                          render: (line) => line.reservedQty ?? 0,
                        },
                        {
                          key: "fulfilled",
                          header: "Fulfilled",
                          render: (line) => line.fulfilledQty ?? 0,
                        },
                      ]}
                      rows={row.orderItems ?? []}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </ExpandedDetailSection>
          );
        }}
        initialSearchValue={search}
        searchPlaceholder="Search by order, franchise, or tracking"
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

      <ConfirmDialog
        open={cancelDialogOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelDialogOrderId(null);
        }}
        variant="destructive"
        title="Cancel shipment?"
        description="This cancels the order. If it was paid, the payment will be refunded."
        confirmLabel="Cancel shipment"
        cancelLabel="Keep shipment"
        isConfirming={
          cancelDialogOrderId !== null && busyOrderId === cancelDialogOrderId
        }
        onConfirm={async () => {
          if (cancelDialogOrderId === null) return;
          const id = cancelDialogOrderId;
          await runAction(
            id,
            () => cancelShipment(id, { refund: true }),
            "Shipment cancelled",
          );
          setCancelDialogOrderId(null);
        }}
      />
    </>
  );
}
