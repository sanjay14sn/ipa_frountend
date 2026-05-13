"use client";

import { RawTableSurface } from "@/components/shared";
import type { DispatchOrderItemAdmin } from "@/services/order.service";
import { dispatchLevelLabel } from "./dispatch-order-helpers";

export function DispatchRecipientTable({
  rows,
  emptyLabel = "None on this order.",
}: {
  rows: DispatchOrderItemAdmin[];
  emptyLabel?: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <RawTableSurface className="shadow-none">
      <table className="min-w-full text-sm [&_tbody>tr>td]:!align-top">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              Student
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              Level
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              Marks
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              CI
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t border-border bg-card last:border-b-0">
              <td className="px-4 py-3 !align-top">
                <div className="font-semibold text-card-foreground">{d.studentName}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground break-all">
                  {d.rollNo || "—"}
                </div>
              </td>
              <td className="px-4 py-3 !align-top text-muted-foreground">
                {dispatchLevelLabel(d)}
              </td>
              <td className="px-4 py-3 !align-top tabular-nums text-card-foreground">
                {d.marksDisplay ?? "—"}
              </td>
              <td className="px-4 py-3 !align-top">
                <div className="font-semibold text-card-foreground">
                  {d.instructorName || "—"}
                </div>
                {d.instructorCode ? (
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {d.instructorCode}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </RawTableSurface>
  );
}
