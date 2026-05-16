"use client";

import { OrderData, OrderItemData } from "@/services/order.service";
import { useOrderById } from "@/hooks/api/order.hooks";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  RawTableSurface,
} from "@/components/shared";

interface OrderDetailsProps {
  order: OrderData;
  lastRow: boolean;
}

function clubLineItems(lines: OrderItemData[]) {
  const map = new Map<number, { inventoryId: number; name: string; sku: string | null; quantity: number }>();
  for (const line of lines) {
    const id = line.inventory?.id ?? -(line.id);
    const existing = map.get(id);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      map.set(id, {
        inventoryId: id,
        name: line.inventory?.name ?? `Item #${line.id}`,
        sku: line.inventory?.sku ?? null,
        quantity: line.quantity,
      });
    }
  }
  return [...map.values()];
}

export default function OrderDetails({
  order,
  lastRow,
}: OrderDetailsProps) {
  const orderQuery = useOrderById(order.id);
  const detailedOrder = orderQuery.data ?? null;
  const loading = orderQuery.isLoading;

  if (loading) {
    return (
      <ExpandedDetailSurface
        className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading order details...</p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  if (!detailedOrder) {
    return (
      <ExpandedDetailSurface
        className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            No order details available
          </p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  const orderItems = detailedOrder.orderItems ?? {};
  const studentKeys = Object.keys(orderItems);

  return (
    <ExpandedDetailSurface
      className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
    >
      <ExpandedDetailSection title={`Order #${detailedOrder.id}`}>
        <DetailFieldsGrid columns={4}>
          <DetailField
            label="Order date"
            value={new Date(detailedOrder.createdAt).toLocaleDateString()}
          />
          <DetailField label="Status" value={detailedOrder.status} />
          <DetailField
            label="Total amount"
            value={`₹${detailedOrder.totalAmount}`}
          />
          <DetailField label="Students / CIs" value={studentKeys.length} />
          {detailedOrder.referenceId ? (
            <DetailField
              label="Payment reference ID"
              value={detailedOrder.referenceId}
              span={2}
            />
          ) : null}
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />
      <ExpandedDetailSection title="Items to receive">
        <RawTableSurface>
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
              </tr>
            </thead>
            <tbody>
              {clubLineItems(detailedOrder.lineItems ?? []).map((line) => (
                <tr key={line.inventoryId} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium text-card-foreground">{line.name}</div>
                    {line.sku && <div className="text-xs text-muted-foreground">{line.sku}</div>}
                  </td>
                  <td className="px-3 py-2 text-card-foreground">{line.quantity}</td>
                </tr>
              ))}
              {clubLineItems(detailedOrder.lineItems ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </RawTableSurface>
      </ExpandedDetailSection>
      {detailedOrder.payment != null ? (
        <>
          <Separator />
          <ExpandedDetailSection title="Payment">
            <DetailFieldsGrid columns={4}>
              <DetailField label="Status" value={detailedOrder.payment.status} />
              <DetailField
                label="Method"
                value={detailedOrder.payment.method ?? "—"}
              />
              <DetailField
                label="Amount"
                value={new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: detailedOrder.payment.currency ?? "INR",
                  maximumFractionDigits: 2,
                }).format(Number(detailedOrder.payment.amount))}
              />
              <DetailField
                label="Paid at"
                value={
                  detailedOrder.payment.paidAt
                    ? new Date(detailedOrder.payment.paidAt).toLocaleString()
                    : "—"
                }
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>
        </>
      ) : null}
    </ExpandedDetailSurface>
  );
}
