"use client";

import { DetailDialog } from "@/components/shared/dialog";
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
    <DetailDialog
      open={payment != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="2xl"
      title={
        payment && (payment.razorpayPaymentId || payment.razorpayOrderId)
          ? `Payment details: ${
              payment.razorpayPaymentId || payment.razorpayOrderId
            }`
          : "Payment details"
      }
      description="Detailed captured payment information for audit and support."
    >
      {body && payment ? (
        <div className="rounded-xl border bg-card p-5">
          <PaymentDetailsBody
            payment={body}
            franchiseName={franchiseName}
            franchiseeName={payment.franchisee?.name}
            courseInstructorName={payment.courseInstructor?.name}
            paymentType={payment.type}
          />
        </div>
      ) : null}
    </DetailDialog>
  );
}
