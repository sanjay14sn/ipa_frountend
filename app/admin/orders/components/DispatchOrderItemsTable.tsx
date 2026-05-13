"use client";

import { RawTableSurface } from "@/components/shared";
import type { DispatchOrderItemAdmin } from "@/services/order.service";
import { dispatchLevelLabel } from "./dispatch-order-helpers";

function typeLabel(itemType: string) {
  if (itemType === "CERTIFICATE") return "Certificate";
  if (itemType === "ID_CARD") return "ID card";
  return itemType;
}

export function DispatchOrderItemsTable({
  items,
  emptyLabel = "No dispatch lines.",
}: {
  items: DispatchOrderItemAdmin[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <RawTableSurface>
      <table className="min-w-full text-sm [&_tbody>tr>td]:!align-top">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Student</th>
            <th className="px-3 py-2 text-left">Level</th>
            <th className="px-3 py-2 text-left">Marks</th>
            <th className="px-3 py-2 text-left">CI</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="px-3 py-2 !align-top font-medium">{typeLabel(d.itemType)}</td>
              <td className="px-3 py-2 !align-top">
                <div className="font-medium text-card-foreground">{d.studentName}</div>
                <div className="text-xs text-muted-foreground">{d.rollNo || "—"}</div>
              </td>
              <td className="px-3 py-2 !align-top text-muted-foreground">{dispatchLevelLabel(d)}</td>
              <td className="px-3 py-2 !align-top">{d.marksDisplay ?? "—"}</td>
              <td className="px-3 py-2 !align-top">
                <div>{d.instructorName || "—"}</div>
                {d.instructorCode ? (
                  <div className="text-xs text-muted-foreground">{d.instructorCode}</div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </RawTableSurface>
  );
}
