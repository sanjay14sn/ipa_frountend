"use client";

import type { ReactNode } from "react";

/** Minimal summary for franchise fee checkout (use with payment.service + Razorpay). */
export function PaymentCard(props: {
  amountLabel: string;
  agreementId?: number;
  children?: ReactNode;
}) {
  return (
    <div className="rounded border p-4 text-sm">
      <div className="font-medium">Payment</div>
      <div className="mt-1">Amount: {props.amountLabel}</div>
      {props.agreementId != null ? (
        <div className="text-muted-foreground mt-1">
          Agreement #{props.agreementId}
        </div>
      ) : null}
      {props.children ? <div className="mt-3">{props.children}</div> : null}
    </div>
  );
}
