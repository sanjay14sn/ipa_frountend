"use client";

import { useEffect, useRef } from "react";

interface RazorpayPaymentProps {
  orderId: string;
  amount: number;
  currency: string;
  franchiseName: string;
  razorpayKey: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (error: any) => void;
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
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
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
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
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
  userDetails,
}: RazorpayPaymentProps) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // If amount is 0, skip Razorpay and directly call success
    if (amount === 0) {
      console.log("Zero amount payment - creating order directly");
      onSuccess({
        razorpay_payment_id: "",
        razorpay_order_id: orderId,
        razorpay_signature: "",
      });
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

    return () => {};
  }, [orderId, razorpayKey, amount]);

  const initializeRazorpay = () => {
    if (typeof window.Razorpay === "undefined") {
      console.error("Razorpay SDK not loaded");
      onFailure({ error: "Razorpay SDK not loaded" });
      return;
    }

    const effectiveKey =
      razorpayKey || (process.env.NEXT_PUBLIC_RAZORPAY_KEY as string) || "";

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
      amount: amount * 100,
      currency: currency,
      name: "IPA Franchise",
      description: `Order Payment for ${franchiseName}`,
      order_id: orderId,
      handler: function (response: RazorpaySuccessResponse) {
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
        ondismiss: function () {
          console.log("Payment cancelled by user");
          onFailure({ error: "Payment cancelled by user" });
        },
      },
    };

    try {
      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response);
        onFailure(response);
      });
      paymentObject.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      onFailure({ error: "Failed to initialize payment gateway" });
    }
  };

  return null;
}
