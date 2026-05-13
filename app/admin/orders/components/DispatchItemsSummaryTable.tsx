"use client";

import { RawTableSurface } from "@/components/shared";
import type { DispatchOrderItemAdmin } from "@/services/order.service";

export function DispatchItemsSummaryTable({
  items,
}: {
  items: DispatchOrderItemAdmin[];
}) {
  const certCount = items.filter((d) => d.itemType === "CERTIFICATE").length;
  const idCount = items.filter((d) => d.itemType === "ID_CARD").length;
  if (certCount === 0 && idCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">No certificate or ID dispatch lines.</p>
    );
  }

  return (
    <RawTableSurface>
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Dispatch items</th>
            <th className="px-3 py-2 text-left">Count</th>
          </tr>
        </thead>
        <tbody>
          {certCount > 0 ? (
            <tr className="border-t">
              <td className="px-3 py-2 font-medium text-card-foreground">Certificates</td>
              <td className="px-3 py-2">{certCount}</td>
            </tr>
          ) : null}
          {idCount > 0 ? (
            <tr className="border-t">
              <td className="px-3 py-2 font-medium text-card-foreground">ID cards</td>
              <td className="px-3 py-2">{idCount}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </RawTableSurface>
  );
}
