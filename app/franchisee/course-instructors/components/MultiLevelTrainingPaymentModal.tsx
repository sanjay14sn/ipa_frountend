"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  getCITrainingProgress,
  CITrainingProgress,
} from "@/services/course-instructor.service";
import {
  initiateMultiLevelCITrainingPayment,
  verifyMultiLevelCITrainingPayment,
} from "@/services/payment.service";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [trainingProgress, setTrainingProgress] = useState<CITrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState(false);

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
            setIsSettled(true);
            await verifyMultiLevelCITrainingPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });

            toast({
              title: "Payment Successful",
              description: "Training payment completed. First level started, others marked paid.",
            });

            onPaymentSuccess?.();
            onClose();
          } catch (err: any) {
            toast({
              title: "Payment Verification Failed",
              description: err.message || "Failed to verify payment",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: async function () {
            if (!isSettled) {
              await abandonOrderPayment({
                razorpayOrderId: paymentOrder.orderId,
                note: "dismissed",
              }).catch(() => {});
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
      if (activeOrderId && !isSettled) {
        await abandonOrderPayment({
          razorpayOrderId: activeOrderId,
          note: "payment_failed",
        }).catch(() => {});
        setIsSettled(true);
      }
      toast({
        title: "Payment Failed",
        description: err.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  useEffect(() => {
    const handleWindowClose = () => {
      if (!activeOrderId || isSettled) return;
      void abandonOrderPayment({
        razorpayOrderId: activeOrderId,
        note: "page_unload",
      }).catch(() => {});
      setIsSettled(true);
    };
    window.addEventListener("beforeunload", handleWindowClose);
    window.addEventListener("pagehide", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      window.removeEventListener("pagehide", handleWindowClose);
      handleWindowClose();
    };
  }, [activeOrderId, isSettled]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle>Training Payment</DialogTitle>
          <DialogDescription>
            Single payment for all training levels for <strong>{instructorName}</strong>. First level will start; others will be marked paid.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
            <div className="space-y-4">
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
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay Now"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
