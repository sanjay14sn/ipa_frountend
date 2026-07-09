"use client";

import { ItemsTable } from "@/components/shared";
import type { DispatchOrderItemAdmin } from "@/services/order.service";

interface DispatchSummaryRow {
  label: string;
  count: number;
}

export function DispatchItemsSummaryTable({
  items,
}: {
  items: DispatchOrderItemAdmin[];
}) {
  const certCount = items.filter((d) => d.itemType === "CERTIFICATE").length;
  const idCount = items.filter((d) => d.itemType === "ID_CARD").length;
  if (certCount === 0 && idCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No certificate or ID dispatch lines.
      </p>
    );
  }

  const rows: DispatchSummaryRow[] = [
    ...(certCount > 0 ? [{ label: "Certificates", count: certCount }] : []),
    ...(idCount > 0 ? [{ label: "ID cards", count: idCount }] : []),
  ];

  return (
    <ItemsTable<DispatchSummaryRow>
      columns={[
        {
          key: "label",
          header: "Dispatch items",
          render: (r) => (
            <span className="font-medium text-card-foreground">{r.label}</span>
          ),
        },
        { key: "count", header: "Count" },
      ]}
      rows={rows}
    />
  );
}
