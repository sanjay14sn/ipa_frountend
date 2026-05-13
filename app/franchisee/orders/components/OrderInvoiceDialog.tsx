"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useOrderById } from "@/hooks/api/order.hooks";
import { previewOrderInvoice } from "@/services/order.service";
import InvoicePreviewCard from "./InvoicePreviewCard";

interface OrderInvoiceDialogProps {
  orderId: number | null;
  onClose: () => void;
}

export default function OrderInvoiceDialog({
  orderId,
  onClose,
}: OrderInvoiceDialogProps) {
  const orderQuery = useOrderById(orderId ?? undefined);

  const order = orderQuery.data;
  const studentIds: number[] =
    orderId != null && order
      ? [
          ...new Set(
            order.lineItems
              ?.filter((l) => l.studentId != null)
              .map((l) => l.studentId as number) ?? [],
          ),
        ]
      : [];

  const invoiceQuery = useQuery({
    queryKey: ["order-invoice", orderId],
    queryFn: () => previewOrderInvoice(studentIds),
    enabled: studentIds.length > 0,
  });

  return (
    <Dialog open={orderId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Order Invoice — Order #{orderId}</DialogTitle>
          <DialogDescription>
            Per-student breakdown including material cost, starting kit, and
            royalty.
          </DialogDescription>
        </DialogHeader>

        {orderQuery.isError || invoiceQuery.isError ? (
          <p className="text-sm text-destructive">
            Failed to load invoice. Please try again later.
          </p>
        ) : (
          <InvoicePreviewCard
            loading={orderQuery.isLoading || (studentIds.length > 0 && invoiceQuery.isLoading)}
            preview={invoiceQuery.data ?? null}
            selected={studentIds.length}
            emptyMessage="No student items found in this order."
            copyVariant="finalized"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
