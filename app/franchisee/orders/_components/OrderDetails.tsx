"use client";

import { OrderData, OrderItemData } from "@/services/order.service";
import { useOrderById } from "@/hooks/api/order.hooks";
import { Loader2 } from "lucide-react";
import {
  ExpandedDetailSurface,
  ExpandedDetailSection,
  ItemsTable,
} from "@/components/shared";
import { OrderPaymentDetailsPanel } from "@/components/orders/OrderPaymentDetailsPanel";

interface OrderDetailsProps {
  order: OrderData;
  lastRow: boolean;
}

function clubLineItems(lines: OrderItemData[]) {
  const map = new Map<
    number,
    { inventoryId: number; name: string; sku: string | null; quantity: number }
  >();
  for (const line of lines) {
    const id = line.inventory?.id ?? -line.id;
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

export default function OrderDetails({ order, lastRow }: OrderDetailsProps) {
  const orderQuery = useOrderById(order.id);
  const detailedOrder = orderQuery.data ?? null;
  const loading = orderQuery.isLoading;

  const wrapperClass = lastRow
    ? "rounded-b-lg border-t border-border/60"
    : "border-t border-border/60";

  if (loading) {
    return (
      <ExpandedDetailSurface className={wrapperClass}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading order details...
          </p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  if (!detailedOrder) {
    return (
      <ExpandedDetailSurface className={wrapperClass}>
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            No order details available
          </p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  const clubbed = clubLineItems(detailedOrder.lineItems ?? []);

  return (
    <ExpandedDetailSurface className={wrapperClass}>
      <div className="space-y-3 p-3 md:p-4">
        {detailedOrder.referenceId ? (
          <ExpandedDetailSection title="Payment reference">
            <p className="w-fit break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {detailedOrder.referenceId}
            </p>
          </ExpandedDetailSection>
        ) : null}

        <ExpandedDetailSection title="Items to receive">
          <ItemsTable
            columns={[
              {
                key: "item",
                header: "Item",
                render: (line) => (
                  <>
                    <div className="font-medium text-card-foreground">
                      {line.name}
                    </div>
                    {line.sku ? (
                      <div className="text-xs text-muted-foreground">
                        {line.sku}
                      </div>
                    ) : null}
                  </>
                ),
              },
              { key: "quantity", header: "Qty" },
            ]}
            rows={clubbed}
            emptyLabel="No items"
          />
        </ExpandedDetailSection>

        {detailedOrder.payment != null ? (
          <ExpandedDetailSection title="Payment">
            <OrderPaymentDetailsPanel
              payment={detailedOrder.payment}
              hideTitle
              className="border-0 bg-transparent p-0"
              fallbackGoodsGstAmount={detailedOrder.gstAmount ?? null}
            />
          </ExpandedDetailSection>
        ) : null}
      </div>
    </ExpandedDetailSurface>
  );
}
