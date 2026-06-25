"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { TablePageShell } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useRegionDetail,
  useRegionSummaries,
} from "@/hooks/api/region-tracking.hooks";
import type {
  RegionDetail,
  RegionSummary,
  TrackingRow,
} from "@/services/region-tracking.service";

function regionName(r: { state: string | null; isCentral: boolean }): string {
  if (r.isCentral) return "Central / HQ";
  return r.state ?? "Unassigned";
}

function str(row: TrackingRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  return "—";
}

function franchiseName(row: TrackingRow): string {
  const f = row["franchise"] as { name?: string } | null | undefined;
  return f?.name ?? str(row, "franchiseId");
}

type Col = {
  key: string;
  label: string;
  render?: (row: TrackingRow) => ReactNode;
};

function MiniTable({
  columns,
  rows,
  empty,
}: {
  columns: Col[];
  rows: TrackingRow[];
  empty: string;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {c.render ? c.render(row) : str(row, c.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusChips({ byStatus }: { byStatus: Record<string, number> }) {
  const entries = Object.entries(byStatus);
  if (!entries.length) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([status, count]) => (
        <Badge
          key={status}
          variant="secondary"
          className="text-[11px] font-normal"
        >
          {status}: {count}
        </Badge>
      ))}
    </div>
  );
}

function RegionCard({
  region,
  selected,
  onSelect,
}: {
  region: RegionSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className={selected ? "border-primary" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{regionName(region)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {region.adminName}
              {region.isCentral ? " · super admin" : ""}
            </p>
          </div>
          {region.isCentral ? <Badge variant="outline">Central</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Orders</span>
            <span className="text-muted-foreground">{region.orders.total}</span>
          </div>
          <div className="mt-1">
            <StatusChips byStatus={region.orders.byStatus} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">Shipments</span>
          <span className="text-muted-foreground">
            {region.shipments.total}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">Inbound (HQ restock)</span>
          <span className="text-muted-foreground">
            {region.inbound.purchaseOrders} POs · {region.inbound.receipts}{" "}
            receipts
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Warehouse stock</span>
          <span className="flex flex-wrap justify-end gap-1">
            <Badge variant="secondary">{region.stock.items} items</Badge>
            {region.stock.lowStock > 0 ? (
              <Badge variant="outline">{region.stock.lowStock} low</Badge>
            ) : null}
            {region.stock.outOfStock > 0 ? (
              <Badge variant="destructive">{region.stock.outOfStock} out</Badge>
            ) : null}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onSelect}
        >
          {selected ? "Hide details" : "View details"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RegionDrillDown({
  loading,
  detail,
}: {
  loading: boolean;
  detail: RegionDetail | null;
}) {
  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Loading details…
      </p>
    );
  }
  if (!detail) return null;
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">
          {regionName(detail.region)} — details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="orders">
              Orders ({detail.orders.length})
            </TabsTrigger>
            <TabsTrigger value="shipments">
              Shipments ({detail.shipments.length})
            </TabsTrigger>
            <TabsTrigger value="inbound">
              Inbound POs ({detail.purchaseOrders.length})
            </TabsTrigger>
            <TabsTrigger value="receipts">
              Receipts ({detail.receipts.length})
            </TabsTrigger>
            <TabsTrigger value="stock">
              Stock ({detail.stock.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <MiniTable
              empty="No orders in this region."
              rows={detail.orders}
              columns={[
                {
                  key: "id",
                  label: "Order",
                  render: (r) => str(r, "referenceId", "id"),
                },
                { key: "franchise", label: "Franchise", render: franchiseName },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => str(r, "adminStatus", "status"),
                },
                {
                  key: "amount",
                  label: "Amount",
                  render: (r) => str(r, "totalAmount", "totalCost"),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="shipments">
            <MiniTable
              empty="No shipments in this region."
              rows={detail.shipments}
              columns={[
                { key: "id", label: "Shipment" },
                { key: "orderId", label: "Order" },
                { key: "status", label: "Status" },
                {
                  key: "trackingNumber",
                  label: "Tracking",
                  render: (r) => str(r, "trackingNumber"),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="inbound">
            <MiniTable
              empty="No restock purchase orders."
              rows={detail.purchaseOrders}
              columns={[
                {
                  key: "id",
                  label: "PO",
                  render: (r) => str(r, "referenceNo", "id"),
                },
                { key: "status", label: "Status" },
                {
                  key: "totalCost",
                  label: "Total",
                  render: (r) => str(r, "totalCost"),
                },
                {
                  key: "expectedDeliveryAt",
                  label: "Expected",
                  render: (r) => str(r, "expectedDeliveryAt"),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="receipts">
            <MiniTable
              empty="No receipts."
              rows={detail.receipts}
              columns={[
                { key: "id", label: "Receipt" },
                { key: "purchaseOrderId", label: "PO" },
                {
                  key: "receivedBy",
                  label: "Received by",
                  render: (r) => str(r, "receivedBy"),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="stock">
            <MiniTable
              empty="No stock in this warehouse."
              rows={detail.stock}
              columns={[
                { key: "name", label: "Item" },
                { key: "sku", label: "SKU" },
                {
                  key: "onHandQty",
                  label: "On hand",
                  render: (r) => str(r, "onHandQty"),
                },
                {
                  key: "availableQty",
                  label: "Available",
                  render: (r) => str(r, "availableQty"),
                },
                {
                  key: "reorderPoint",
                  label: "Reorder",
                  render: (r) => str(r, "reorderPoint"),
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function AdminRegionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);

  useEffect(() => {
    if (user && !isSuperAdmin) router.replace("/admin/dashboard");
  }, [isSuperAdmin, router, user]);

  const summariesQuery = useRegionSummaries(isSuperAdmin);
  const detailQuery = useRegionDetail(selectedAdminId);

  if (user && !isSuperAdmin) return null;

  const regions = summariesQuery.data ?? [];

  return (
    <TablePageShell
      title="Regions"
      description="Track orders and the movement of materials across every region (read-only)."
    >
      {summariesQuery.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading regions…
        </p>
      ) : regions.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No regions yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
            <RegionCard
              key={region.adminId}
              region={region}
              selected={selectedAdminId === region.adminId}
              onSelect={() =>
                setSelectedAdminId((cur) =>
                  cur === region.adminId ? null : region.adminId,
                )
              }
            />
          ))}
        </div>
      )}

      {selectedAdminId != null ? (
        <RegionDrillDown
          loading={detailQuery.isLoading}
          detail={detailQuery.data ?? null}
        />
      ) : null}
    </TablePageShell>
  );
}
