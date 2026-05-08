import { Badge } from "@/components/ui/badge";
import { NestedSection } from "@/components/shared";
import { OrderItemData } from "@/services/order.service";
import React from "react";

interface StudentOrderSectionProps {
  studentKey: string;
  items: OrderItemData[];
  orderId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  isLast: boolean;
  isCIOrder?: boolean;
}

export default function StudentOrderSection({
  studentKey,
  items,
  orderId,
  isExpanded,
  onToggle,
  isLast: _isLast,
  isCIOrder: _isCIOrder = false,
}: StudentOrderSectionProps) {
  const sectionId = `${orderId}-${studentKey}`;

  return (
    <NestedSection
      id={sectionId}
      title={studentKey}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={
        <Badge variant="outline">
          {items.length} {items.length === 1 ? "item" : "items"}
        </Badge>
      }
      showConnector={false}
    >
      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ordered materials
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <span className="text-sm text-card-foreground">
                {item.inventory?.name ?? `Item #${item.id}`}
              </span>
              <span className="text-xs text-muted-foreground">
                Qty:{" "}
                <span className="font-medium text-card-foreground">
                  {item.quantity}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </NestedSection>
  );
}
