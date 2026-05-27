"use client";

import { useCallback, useEffect, useRef } from "react";
import { RAZORPAY_KEY_ID } from "@/lib/config";
import { sendClientLog } from "@/lib/client-telemetry";
import { toast } from "sonner";

interface RazorpayPaymentProps {
  orderId: string;
  amount: number;
  currency: string;
  franchiseName: string;
  razorpayKey: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (error: any) => void;
  onAbandon?: (input: { orderId: string; reason: string }) => Promise<void> | void;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name: string;
    email: string;
    contact: string;
  };
  theme?: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: any) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export default function RazorpayPayment({
  orderId,
  amount,
  currency,
  franchiseName,
  razorpayKey,
  onSuccess,
  onFailure,
  onAbandon,
  userDetails,
}: RazorpayPaymentProps) {
  const hasInitialized = useRef(false);
  const isSettledRef = useRef(false);

  // Keep prop/callback refs always up-to-date without adding them to dep arrays.
  // This prevents stale-closure bugs AND stops dep changes from re-triggering the
  // init effect (which would fire a spurious abandon during cleanup).
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  const onAbandonRef = useRef(onAbandon);
  const amountRef = useRef(amount);
  const currencyRef = useRef(currency);
  const franchiseNameRef = useRef(franchiseName);
  const razorpayKeyRef = useRef(razorpayKey);
  const userDetailsRef = useRef(userDetails);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onFailureRef.current = onFailure;
    onAbandonRef.current = onAbandon;
    amountRef.current = amount;
    currencyRef.current = currency;
    franchiseNameRef.current = franchiseName;
    razorpayKeyRef.current = razorpayKey;
    userDetailsRef.current = userDetails;
  });

  const settleAsAbandoned = useCallback(
    async (reason: string) => {
      if (isSettledRef.current) return;
      isSettledRef.current = true;
      if (onAbandonRef.current && orderId?.trim()) {
        await onAbandonRef.current({ orderId, reason });
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const rupees = Number(amountRef.current);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      onFailureRef.current({ error: "Invalid payment amount" });
      return;
    }

    if (!orderId?.trim()) {
      onFailureRef.current({ error: "Missing Razorpay order id" });
      return;
    }

    const launch = () => {
      if (typeof window.Razorpay === "undefined") {
        sendClientLog({ level: "error", event: "razorpay-sdk-missing", message: "Razorpay SDK not loaded" });
        onFailureRef.current({ error: "Razorpay SDK not loaded" });
        return;
      }

      const amountPaise = Math.round(Number(amountRef.current) * 100);
      const effectiveKey =
        razorpayKeyRef.current ||
        RAZORPAY_KEY_ID;

      if (!effectiveKey) {
        sendClientLog({ level: "error", event: "razorpay-key-missing", message: "Razorpay Key ID missing from backend response and env" });
        onFailureRef.current({
          error:
            "Payment configuration error. Razorpay key is missing. Please contact support.",
        });
        return;
      }

      const currentUserDetails = userDetailsRef.current;
      const options: RazorpayOptions = {
        key: effectiveKey,
        amount: amountPaise,
        currency: currencyRef.current,
        name: "IPA Franchise",
        description: `Order Payment for ${franchiseNameRef.current}`,
        order_id: orderId,
        handler: function (response: RazorpaySuccessResponse) {
          isSettledRef.current = true;
          onSuccessRef.current(response);
        },
        prefill: {
          name: currentUserDetails.name,
          // `email` is required by the prop interface; the `.mail` fallback
          // guarded against legacy callers that used the old field name.
          // The interface enforces `email` today, so the cast is gone.
          email: currentUserDetails.email || "",
          contact: currentUserDetails.phone || "",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: async function () {
            const alreadySettled = isSettledRef.current;
            await settleAsAbandoned("dismissed");
            if (!alreadySettled) {
              onFailureRef.current({ error: "Payment cancelled by user" });
            }
          },
        },
      };

      try {
        const paymentObject = new window.Razorpay(options);
        paymentObject.on("payment.failed", function (response: any) {
          // Do not abandon here — Razorpay allows retrying another payment method
          // within the same order/modal. ondismiss will handle the final failure.
          sendClientLog({ level: "error", event: "razorpay-payment-failed", message: "Payment attempt failed", context: { response } });
          toast.error("Payment failed. Please try a different payment method or try again.");
        });
        paymentObject.open();
      } catch (error) {
        sendClientLog({ level: "error", event: "razorpay-init-error", message: error instanceof Error ? error.message : "Failed to initialize payment gateway", context: { error } });
        onFailureRef.current({ error: "Failed to initialize payment gateway" });
      }
    };

    if (typeof window.Razorpay !== "undefined") {
      launch();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = launch;
    script.onerror = () => {
      sendClientLog({ level: "error", event: "razorpay-sdk-load-error", message: "Failed to load Razorpay checkout.js script" });
      onFailureRef.current({ error: "Failed to load Razorpay SDK" });
    };
    document.body.appendChild(script);
    // No cleanup that calls abandon — StrictMode double-effect and parent
    // re-renders would otherwise abandon a live, in-progress payment.
    // The parent's beforeunload/pagehide/component-unmount handlers cover
    // real abandonment, and the modal's ondismiss handles user cancellation.
  }, [orderId, settleAsAbandoned]);

  useEffect(() => {
    const handleWindowClose = () => {
      void settleAsAbandoned("page_unload");
    };
    window.addEventListener("beforeunload", handleWindowClose);
    window.addEventListener("pagehide", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      window.removeEventListener("pagehide", handleWindowClose);
    };
  }, [settleAsAbandoned]);

  return null;
}
