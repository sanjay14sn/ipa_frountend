"use client";

import { ItemsTable } from "@/components/shared";
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
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ItemsTable<DispatchOrderItemAdmin>
      className="shadow-none"
      columns={[
        {
          key: "student",
          header: "Student",
          render: (d) => (
            <>
              <div className="font-semibold text-card-foreground">
                {d.studentName}
              </div>
              <div className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                {d.rollNo || "—"}
              </div>
            </>
          ),
        },
        {
          key: "level",
          header: "Level",
          render: (d) => (
            <span className="text-muted-foreground">
              {dispatchLevelLabel(d)}
            </span>
          ),
        },
        {
          key: "marks",
          header: "Marks",
          render: (d) => (
            <span className="tabular-nums text-card-foreground">
              {d.marksDisplay ?? "—"}
            </span>
          ),
        },
        {
          key: "ci",
          header: "CI",
          render: (d) => (
            <>
              <div className="font-semibold text-card-foreground">
                {d.instructorName || "—"}
              </div>
              {d.instructorCode ? (
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {d.instructorCode}
                </div>
              ) : null}
            </>
          ),
        },
      ]}
      rows={rows}
    />
  );
}
