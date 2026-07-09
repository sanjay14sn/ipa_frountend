"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentData } from "@/services/payment.service";
import {
  PaymentDetailsBody,
  type PaymentBodyData,
} from "@/components/orders/PaymentDetailsBody";

interface PaymentDetailDialogProps {
  payment: PaymentData | null;
  franchiseName: string;
  onClose: () => void;
}

export function PaymentDetailDialog({
  payment,
  franchiseName,
  onClose,
}: PaymentDetailDialogProps) {
  const body: PaymentBodyData | null = payment
    ? { ...payment, date: payment.createdAt }
    : null;

  return (
    <Dialog
      open={payment != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {body && payment ? (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment details:{" "}
              {payment.razorpayPaymentId ||
                payment.razorpayOrderId ||
                `#${payment.id}`}
            </DialogTitle>
            <DialogDescription>
              Detailed captured payment information for audit and support.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-card p-5">
            <PaymentDetailsBody
              payment={body}
              franchiseName={franchiseName}
              franchiseeName={payment.franchisee?.name}
              paymentType={payment.type}
            />
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
