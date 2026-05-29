"use client";

import { OrderData, OrderItemData } from "@/services/order.service";
import { useOrderById } from "@/hooks/api/order.hooks";
import {
  CreditCard,
  Loader2,
  Package,
} from "lucide-react";
import {
  ExpandedDetailSurface,
  ProfileCard,
  ProfileCardSection,
  RawTableSurface,
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

  const orderItems = detailedOrder.orderItems ?? {};
  const studentKeys = Object.keys(orderItems);
  const clubbed = clubLineItems(detailedOrder.lineItems ?? []);

  return (
    <ExpandedDetailSurface className={wrapperClass}>
      <div className="space-y-3 p-3 md:p-4">
        {detailedOrder.referenceId ? (
          <ProfileCard>
            <ProfileCardSection icon={CreditCard} label="Payment reference">
              <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                {detailedOrder.referenceId}
              </p>
            </ProfileCardSection>
          </ProfileCard>
        ) : null}

        <ProfileCard>
          <ProfileCardSection icon={Package} label="Items to receive">
            <RawTableSurface>
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Item
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clubbed.map((line) => (
                    <tr key={line.inventoryId} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium text-card-foreground">
                          {line.name}
                        </div>
                        {line.sku ? (
                          <div className="text-xs text-muted-foreground">
                            {line.sku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-card-foreground">
                        {line.quantity}
                      </td>
                    </tr>
                  ))}
                  {clubbed.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-4 text-center text-sm text-muted-foreground"
                      >
                        No items
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </RawTableSurface>
          </ProfileCardSection>
        </ProfileCard>

        {detailedOrder.payment != null ? (
          <ProfileCard>
            <ProfileCardSection icon={CreditCard} label="Payment">
              <OrderPaymentDetailsPanel
                payment={detailedOrder.payment}
                hideTitle
                className="border-0 bg-transparent p-0"
                fallbackGoodsGstAmount={detailedOrder.gstAmount ?? null}
              />
            </ProfileCardSection>
          </ProfileCard>
        ) : null}
      </div>
    </ExpandedDetailSurface>
  );
}
