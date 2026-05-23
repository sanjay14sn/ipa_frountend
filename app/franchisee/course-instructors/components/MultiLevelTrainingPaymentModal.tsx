"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FormDialog } from "@/components/shared/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import {
  initiateMultiLevelCITrainingPayment,
  verifyMultiLevelCITrainingPayment,
} from "@/services/payment.service";
import { toast } from "sonner";
import { abandonOrderPayment } from "@/services/order.service";

interface MultiLevelTrainingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  onPaymentSuccess?: () => void;
}

export function MultiLevelTrainingPaymentModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onPaymentSuccess,
}: MultiLevelTrainingPaymentModalProps) {
  const [trainingProgress, setTrainingProgress] = useState<CITrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const isSettledRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const progress = await getCITrainingProgress(instructorId);
      setTrainingProgress(progress);
    } catch (err: any) {
      setError(err.message || "Failed to load training levels");
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const trainingsList = trainingProgress?.trainings ?? [];

  const unpaidTrainings = trainingsList.filter(
    (t) => !t.paid && !t.isCompleted,
  );

  const totalAmount = unpaidTrainings.reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );

  const handlePayment = async () => {
    if (unpaidTrainings.length === 0) return;

    try {
      setProcessing(true);

      const levelIds = unpaidTrainings.map((t) => t.trainingLevelId);
      const paymentOrder = await initiateMultiLevelCITrainingPayment(
        instructorId,
        { trainingLevelIds: levelIds },
      );
      setActiveOrderId(paymentOrder.orderId);
      setIsSettled(false);

      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      const options = {
        key: paymentOrder.key,
        amount: paymentOrder.amount * 100,
        currency: paymentOrder.currency,
        name: "IPA Training Payment",
        description: `Training for ${instructorName}`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: instructorName,
          email: "",
          contact: "",
        },
        handler: async function (response: any) {
          try {
            isSettledRef.current = true;
            setIsSettled(true);
            await verifyMultiLevelCITrainingPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });

            toast.success("Training payment completed. First level started, others marked paid.");

            onPaymentSuccess?.();
            onClose();
          } catch (err: any) {
            toast.error(err.message || "Failed to verify payment");
          }
        },
        modal: {
          ondismiss: async function () {
            if (!isSettledRef.current) {
              await abandonOrderPayment({
                razorpayOrderId: paymentOrder.orderId,
                note: "dismissed",
              }).catch(() => {});
              isSettledRef.current = true;
              setIsSettled(true);
            }
            setProcessing(false);
          },
        },
        theme: {
          color: "#3399cc",
        },
      };

      const Rzp = (window as unknown as { Razorpay: new (o: object) => { open: () => void } })
        .Razorpay;
      const rzp = new Rzp(options);
      onClose(); // Close dialog before opening Razorpay so its overlay doesn't trap focus
      rzp.open();
    } catch (err: any) {
      if (activeOrderId && !isSettledRef.current) {
        await abandonOrderPayment({
          razorpayOrderId: activeOrderId,
          note: "payment_failed",
        }).catch(() => {});
        isSettledRef.current = true;
        setIsSettled(true);
      }
      toast.error(err.message || "Failed to initiate payment");
      setProcessing(false);
    }
  };

  useEffect(() => {
    const handleWindowClose = () => {
      if (!activeOrderId || isSettledRef.current) return;
      void abandonOrderPayment({
        razorpayOrderId: activeOrderId,
        note: "page_unload",
      }).catch(() => {});
      isSettledRef.current = true;
      setIsSettled(true);
    };
    window.addEventListener("beforeunload", handleWindowClose);
    window.addEventListener("pagehide", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      window.removeEventListener("pagehide", handleWindowClose);
      // Do NOT call handleWindowClose() here — it fires on every dep change
    };
  }, [activeOrderId]);

  const canPay = !loading && !error && unpaidTrainings.length > 0;

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="md"
      headerIcon={CreditCard}
      title="Training Payment"
      description={
        <>
          Single payment for all training levels for <strong>{instructorName}</strong>. First level will start; others will be marked paid.
        </>
      }
      onSubmit={(e) => {
        e.preventDefault();
        void handlePayment();
      }}
      submitLabel="Pay Now"
      cancelLabel="Cancel"
      isSubmitting={processing}
      canSubmit={canPay}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : unpaidTrainings.length === 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {trainingProgress && trainingsList.length > 0
              ? "All training levels have been paid."
              : "No training levels registered."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {unpaidTrainings.length} level{unpaidTrainings.length !== 1 ? "s" : ""}
            </span>
            <span className="text-2xl font-bold">
              ₹{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
