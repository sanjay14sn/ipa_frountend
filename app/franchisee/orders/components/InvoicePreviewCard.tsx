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
}: InvoicePreviewCardProps) {
  const linesByStudentId = useMemo(() => {
    const map = new Map<number, InvoicePreview['lines']>();
    if (!preview) return map;
    for (const line of preview.lines) {
      if (line.studentId == null) continue;
      const bucket = map.get(line.studentId) ?? [];
      bucket.push(line);
      map.set(line.studentId, bucket);
    }
    return map;
  }, [preview]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invoice preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading invoice preview...
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
                    <div key={student.studentId} className="overflow-hidden rounded-lg border">
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
                        <span className="text-sm font-semibold text-card-foreground">{student.studentName}</span>
                        <span className="text-xs text-muted-foreground">· {student.levelName}</span>
                      </div>

                      <div className="divide-y">
                        {isFeeOnly ? (
                          <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm font-medium text-card-foreground">Program Fees</span>
                            <span className="text-sm text-card-foreground">{currencyFormatter.format(student.totalPrice)}</span>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-sm font-medium text-card-foreground">Material Cost</span>
                                <span className="text-sm text-card-foreground">{currencyFormatter.format(student.materialCost)}</span>
                              </div>
                              {levelItems.length > 0 && (
                                <div className="space-y-0.5 px-3 pb-2">
                                  {levelItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between pl-4 text-xs text-muted-foreground">
                                      <span>↳ {stripStudentPrefix(item.description)}</span>
                                      <span>×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {student.isFirstLevel && (student.kitCost > 0 || kitItems.length > 0) && (
                              <div>
                                <div className="flex items-center justify-between px-3 py-2">
                                  <span className="text-sm font-medium text-card-foreground">Starting Kit</span>
                                  <span className="text-sm text-card-foreground">{currencyFormatter.format(student.kitCost)}</span>
                                </div>
                                {kitItems.length > 0 && (
                                  <div className="space-y-0.5 px-3 pb-2">
                                    {kitItems.map((item, i) => (
                                      <div key={i} className="flex items-center justify-between pl-4 text-xs text-muted-foreground">
                                        <span>↳ {stripStudentPrefix(item.description)}</span>
                                        <span>×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between px-3 py-2">
                              <span className="text-sm font-medium text-card-foreground">Royalty</span>
                              <span className="text-sm text-card-foreground">{currencyFormatter.format(student.royalty)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between bg-muted/20 px-3 py-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student total</span>
                          <span className="text-sm font-semibold text-card-foreground">{currencyFormatter.format(student.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : preview.lines.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Line</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line, index) => (
                      <tr key={`${line.code}-${index}`} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium text-card-foreground">{line.description}</div>
                          <div className="text-xs text-muted-foreground">{line.code}</div>
                        </td>
                        <td className="px-3 py-2 text-card-foreground">{line.quantity}</td>
                        <td className="px-3 py-2 text-right text-card-foreground">
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

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preview total</span>
                <span className="text-lg font-semibold text-card-foreground">
                  {currencyFormatter.format(preview.totalAmount)}
                </span>
              </div>
              {zeroAmountLabel && preview.totalAmount === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{zeroAmountLabel}</p>
              )}
              {!zeroAmountLabel && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pre-shipment stages such as allocation and backorder stay internal; you will see these orders as Processing until they ship.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Invoice preview is unavailable for the selection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
