"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type InvoicePreview } from "@/services/order.service";

export interface InvoicePreviewCardProps {
  loading: boolean;
  preview: InvoicePreview | null;
  selected: number;
  emptyMessage: string;
  zeroAmountLabel?: string;
  /** When set, omits the outer Card — for use inside admin order invoice tabs. */
  variant?: "card" | "embedded";
  /** Hide the bottom total block (e.g. when parent shows a sticky footer). */
  hideFooter?: boolean;
  /**
   * `finalized` — paid order views (admin / order details): no "preview" wording.
   * `preview` — franchisee cart before checkout: estimated totals.
   */
  copyVariant?: "preview" | "finalized";
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function stripStudentPrefix(description: string) {
  const idx = description.indexOf(' - ');
  return idx !== -1 ? description.slice(idx + 3) : description;
}

export default function InvoicePreviewCard({
  loading,
  preview,
  selected,
  emptyMessage,
  zeroAmountLabel,
  variant = "card",
  hideFooter = false,
  copyVariant = "preview",
}: InvoicePreviewCardProps) {
  const linesByStudentId = useMemo(() => {
    const map = new Map<number, InvoicePreview['lines']>();
    if (!preview) return map;

    if (preview.studentGroups?.length) {
      for (const g of preview.studentGroups) {
        const synthetic: InvoicePreview['lines'] = g.items.map((it) => ({
          code:
            it.itemType === 'KIT'
              ? 'KIT_ITEM'
              : it.itemType === 'FEE'
                ? 'PROGRAM_FEES'
                : 'LEVEL_ITEM',
          description: `${g.studentName} - ${it.name}`,
          quantity: it.quantity,
          unitPrice: 0,
          totalPrice: 0,
          studentId: g.studentId,
          inventoryItemId: it.inventoryItemId,
          itemType: (it.itemType === 'FEE' ? 'FEE' : it.itemType === 'KIT' ? 'KIT' : 'LEVEL') as
            | 'LEVEL'
            | 'KIT'
            | 'FEE',
        }));
        map.set(g.studentId, synthetic);
      }
      return map;
    }

    for (const line of preview.lines) {
      if (line.studentId == null) continue;
      const bucket = map.get(line.studentId) ?? [];
      bucket.push(line);
      map.set(line.studentId, bucket);
    }
    return map;
  }, [preview]);

  const isFinalized = copyVariant === "finalized";

  const body = (
      <>
        {selected === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading invoice…
          </div>
        ) : preview ? (
          <>
            {preview.students.length > 0 ? (
              <div className="space-y-3">
                {preview.students.map((student) => {
                  const studentLines = linesByStudentId.get(student.studentId) ?? [];
                  const levelItems = studentLines.filter((l) => l.itemType === 'LEVEL');
                  const kitItems = studentLines.filter((l) => l.itemType === 'KIT');
                  const isFeeOnly = studentLines.some((l) => l.itemType === 'FEE');

                  return (
                    <div key={student.studentId} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
                        <span className="text-sm font-semibold text-card-foreground">{student.studentName}</span>
                        <span className="text-xs text-muted-foreground">· {student.levelName}</span>
                      </div>

                      <div className="divide-y divide-border">
                        {isFeeOnly ? (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm font-medium text-card-foreground">Program Fees</span>
                            <span className="text-sm tabular-nums text-card-foreground">{currencyFormatter.format(student.totalPrice)}</span>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-sm font-medium text-card-foreground">
                                  Material Cost
                                  {(student.materialCostGst ?? 0) > 0 ? (
                                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                      (incl. 18% GST {currencyFormatter.format(student.materialCostGst ?? 0)})
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-sm tabular-nums text-card-foreground">{currencyFormatter.format(student.materialCost)}</span>
                              </div>
                              {levelItems.length > 0 && (
                                <div className="space-y-0.5 px-4 pb-2.5">
                                  {levelItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between pl-4 text-xs text-muted-foreground">
                                      <span><span className="text-muted-foreground/80">↳</span> {stripStudentPrefix(item.description)}</span>
                                      <span className="tabular-nums">×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {student.isFirstLevel && (student.kitCost > 0 || kitItems.length > 0) && (
                              <div>
                                <div className="flex items-center justify-between px-4 py-2.5">
                                  <span className="text-sm font-medium text-card-foreground">Starting Kit</span>
                                  <span className="text-sm tabular-nums text-card-foreground">{currencyFormatter.format(student.kitCost)}</span>
                                </div>
                                {kitItems.length > 0 && (
                                  <div className="space-y-0.5 px-4 pb-2.5">
                                    {kitItems.map((item, i) => (
                                      <div key={i} className="flex items-center justify-between pl-4 text-xs text-muted-foreground">
                                        <span><span className="text-muted-foreground/80">↳</span> {stripStudentPrefix(item.description)}</span>
                                        <span className="tabular-nums">×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-sm font-medium text-card-foreground">
                                Royalty
                                {(student.royaltyGst ?? 0) > 0 ? (
                                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                    (incl. 18% GST {currencyFormatter.format(student.royaltyGst ?? 0)})
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-sm tabular-nums text-card-foreground">{currencyFormatter.format(student.royalty)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between bg-muted/25 px-4 py-2.5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student total</span>
                          <span className="text-sm font-semibold tabular-nums text-card-foreground">{currencyFormatter.format(student.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : preview.lines.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Line</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line, index) => (
                      <tr key={`${line.code}-${index}`} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-card-foreground">{line.description}</div>
                          <div className="text-xs text-muted-foreground">{line.code}</div>
                        </td>
                        <td className="px-4 py-2.5 text-card-foreground">{line.quantity}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-card-foreground">
                          {currencyFormatter.format(line.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No materials configured for the selected instructors&apos; active training levels.
              </p>
            )}

            {!hideFooter ? (
            <div className="rounded-xl border border-border bg-muted/25 p-4">
              {preview.subtotalAmount != null &&
              preview.gstAmount != null &&
              preview.gstAmount > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums text-card-foreground">
                      {currencyFormatter.format(preview.subtotalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="tabular-nums text-card-foreground">
                      {currencyFormatter.format(preview.gstAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {isFinalized ? "Total" : "Estimated total"}
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-card-foreground">
                      {currencyFormatter.format(preview.totalAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isFinalized ? "Total" : "Estimated total"}
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-card-foreground">
                    {currencyFormatter.format(preview.totalAmount)}
                  </span>
                </div>
              )}
              {zeroAmountLabel && preview.totalAmount === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{zeroAmountLabel}</p>
              )}
              {!zeroAmountLabel && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {isFinalized
                    ? "Payment has been received at the franchise. Allocation and shipping status are tracked on the order."
                    : "Pre-shipment stages such as allocation and backorder stay internal; you will see these orders as Processing until they ship."}
                </p>
              )}
            </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not load the invoice for this selection.
          </p>
        )}
      </>
  );

  if (variant === "embedded") {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-primary">Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {body}
      </CardContent>
    </Card>
  );
}
