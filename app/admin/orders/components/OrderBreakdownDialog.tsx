"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOrderByIdAdmin, type OrderData, type OrderItemData } from "@/services/order.service";

interface StudentGroup {
  studentId: number;
  studentName: string;
  items: OrderItemData[];
  subtotal: number;
}

function groupByStudent(lineItems: OrderItemData[]): StudentGroup[] {
  const map = new Map<number, StudentGroup>();
  for (const line of lineItems) {
    if (line.studentId == null) continue;
    const existing = map.get(line.studentId);
    const name = line.student?.name ?? `Student #${line.studentId}`;
    if (existing) {
      existing.items.push(line);
      existing.subtotal += Number(line.totalPrice ?? 0);
    } else {
      map.set(line.studentId, {
        studentId: line.studentId,
        studentName: name,
        items: [line],
        subtotal: Number(line.totalPrice ?? 0),
      });
    }
  }
  return [...map.values()];
}

const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

interface OrderBreakdownDialogProps {
  orderId: number | null;
  onClose: () => void;
}

export function OrderBreakdownDialog({ orderId, onClose }: OrderBreakdownDialogProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId == null) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    setOrder(null);
    setLoading(true);
    getOrderByIdAdmin(orderId)
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch(() => { if (!cancelled) setOrder(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const groups = order ? groupByStudent(order.lineItems ?? []) : [];

  return (
    <Dialog open={orderId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Order breakdown — {order?.referenceId ?? (orderId ? `#${orderId}` : "")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading breakdown...
          </div>
        ) : groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No per-student breakdown available for this order.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.studentId} className="overflow-hidden rounded-lg border">
                <div className="bg-muted/50 px-3 py-2 text-sm font-semibold text-card-foreground">
                  {group.studentName}
                </div>
                <div className="divide-y">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-card-foreground">
                        {item.inventory?.name ?? `Item #${item.id}`}
                      </span>
                      <span className="text-muted-foreground">×{item.quantity}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-muted/20 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Student total
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">
                      {fmt.format(group.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <span className="text-sm text-muted-foreground">Order total</span>
              <span className="text-lg font-semibold text-card-foreground">
                {fmt.format(Number(order?.totalAmount ?? 0))}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
