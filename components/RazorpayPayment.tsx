"use client";

import { useCallback, useEffect, useRef } from "react";

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

  const settleAsAbandoned = useCallback(
    async (reason: string) => {
      if (isSettledRef.current) return;
      isSettledRef.current = true;
      if (onAbandon && orderId?.trim()) {
        await onAbandon({ orderId, reason });
      }
    },
    [onAbandon, orderId],
  );

  const initializeRazorpay = useCallback(() => {
    if (typeof window.Razorpay === "undefined") {
      console.error("Razorpay SDK not loaded");
      onFailure({ error: "Razorpay SDK not loaded" });
      return;
    }

    const amountPaise = Math.round(Number(amount) * 100);

    const effectiveKey =
      razorpayKey ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      (process.env.NEXT_PUBLIC_RAZORPAY_KEY as string) ||
      "";

    if (!effectiveKey) {
      console.error("Razorpay Key ID is missing from backend response and env");
      onFailure({
        error:
          "Payment configuration error. Razorpay key is missing. Please contact support.",
      });
      return;
    }

    const options: RazorpayOptions = {
      key: effectiveKey,
      amount: amountPaise,
      currency: currency,
      name: "IPA Franchise",
      description: `Order Payment for ${franchiseName}`,
      order_id: orderId,
      handler: function (response: RazorpaySuccessResponse) {
        isSettledRef.current = true;
        console.log("Payment successful! Verifying...");
        console.log("Payment ID:", response.razorpay_payment_id);
        console.log("Order ID:", response.razorpay_order_id);
        console.log("Signature:", response.razorpay_signature);
        onSuccess(response);
      },
      prefill: {
        name: userDetails.name,
        email: (userDetails as any).email || (userDetails as any).mail || "",
        contact: userDetails.phone,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: async function () {
          await settleAsAbandoned("dismissed");
          console.log("Payment cancelled by user");
          onFailure({ error: "Payment cancelled by user" });
        },
      },
    };

    try {
      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", async function (response: any) {
        await settleAsAbandoned("payment_failed");
        console.error("Payment failed:", response);
        onFailure(response);
      });
      paymentObject.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      onFailure({ error: "Failed to initialize payment gateway" });
    }
  }, [
    amount,
    currency,
    franchiseName,
    onFailure,
    onSuccess,
    orderId,
    razorpayKey,
    settleAsAbandoned,
    userDetails,
  ]);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const rupees = Number(amount);
    // Parent should not mount us for zero-amount flow; never fake-success with empty ids.
    if (!Number.isFinite(rupees) || rupees <= 0) {
      onFailure({ error: "Invalid payment amount" });
      return;
    }

    if (!orderId?.trim()) {
      onFailure({ error: "Missing Razorpay order id" });
      return;
    }

    if (typeof window.Razorpay !== "undefined") {
      initializeRazorpay();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      initializeRazorpay();
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      onFailure({ error: "Failed to load Razorpay SDK" });
    };
    document.body.appendChild(script);

    return () => {
      void settleAsAbandoned("component_unmount");
    };
  }, [amount, initializeRazorpay, onFailure, orderId, settleAsAbandoned]);

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
