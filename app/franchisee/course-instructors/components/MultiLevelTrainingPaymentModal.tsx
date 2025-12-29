"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, instructorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedLevelIds([]);

      // Load CI-specific training progress (shows all registered levels)
      const progress = await getCITrainingProgress(instructorId);
      setTrainingProgress(progress);
    } catch (err: any) {
      setError(err.message || "Failed to load training levels");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLevel = (levelId: number) => {
    setSelectedLevelIds((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const calculateTotalAmount = () => {
    if (!trainingProgress) return 0;
    return trainingProgress.trainings
      .filter((training) => selectedLevelIds.includes(training.trainingLevelId))
      .reduce((sum, training) => sum + training.amount, 0);
  };

  // Get only unpaid and not completed levels (registered levels that can be paid)
  const availableTrainings = trainingProgress?.trainings.filter(
    (training) => !training.isCompleted && !training.isActive
  ) || [];

  // Get completed/graduated level IDs
  const completedLevelIds = trainingProgress?.trainings
    .filter((t) => t.isCompleted)
    .map((t) => t.trainingLevelId) || [];

  // Get active level ID
  const activeLevelId = trainingProgress?.activeTraining
    ? trainingProgress.trainings.find(
        (t) => t.id === trainingProgress.activeTraining?.id
      )?.trainingLevelId
    : null;

  const handlePayment = async () => {
    if (selectedLevelIds.length === 0) {
      toast({
        title: "No Levels Selected",
        description: "Please select at least one training level",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      // Initiate payment
      const paymentOrder = await initiateMultiLevelCITrainingPayment(
        instructorId,
        selectedLevelIds
      );

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      // Open Razorpay payment dialog
      const options = {
        key: paymentOrder.key,
        amount: paymentOrder.amount * 100,
        currency: paymentOrder.currency,
        name: "IPA Training Payment",
        description: `Multi-level training for ${instructorName}`,
        order_id: paymentOrder.orderId,
        handler: async function (response: any) {
          try {
            await verifyMultiLevelCITrainingPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });

            toast({
              title: "Payment Successful",
              description: `Training enrolled successfully for levels: ${paymentOrder.trainingLevels}`,
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
          ondismiss: function () {
            setProcessing(false);
          },
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({
        title: "Payment Failed",
        description: err.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle className="text-2xl">Training Level Payment</DialogTitle>
          <DialogDescription className="text-base">
            Pay for training levels for <strong>{instructorName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-sm text-gray-500">Loading training levels...</p>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {availableTrainings.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {trainingProgress && trainingProgress.trainings.length > 0
                      ? "All registered training levels have been paid. The instructor is either in training or has completed all levels."
                      : "No training levels registered for this instructor."}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Summary Stats */}
                  {trainingProgress && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-700">
                          {trainingProgress.trainings.length}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Total Levels</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-orange-700">
                          {availableTrainings.length}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">Unpaid</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {completedLevelIds.length}
                        </p>
                        <p className="text-xs text-green-600 mt-1">Completed</p>
                      </div>
                    </div>
                  )}

                  {/* Levels Requiring Payment */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Levels Requiring Payment ({availableTrainings.length})
                    </h3>
                    <div className="space-y-2">
                      {availableTrainings.map((training) => {
                        const isSelected = selectedLevelIds.includes(training.trainingLevelId);
                        
                        return (
                          <div
                            key={training.id}
                            onClick={() => !processing && handleToggleLevel(training.trainingLevelId)}
                            className={`flex items-center space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                            } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <Checkbox
                              id={`level-${training.trainingLevelId}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleLevel(training.trainingLevelId)}
                              disabled={processing}
                              className="h-5 w-5"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base">
                                    {training.trainingLevelName}
                                  </span>
                                  {training.displayOrder && (
                                    <Badge variant="outline" className="text-xs">
                                      Level {training.displayOrder}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xl font-bold text-primary">
                                  ₹{training.amount.toLocaleString()}
                                </div>
                              </div>
                              {isSelected && (
                                <p className="text-xs text-gray-600">
                                  This level will be included in your payment
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Paid/Active Levels - Collapsible */}
                  {(trainingProgress?.trainings.length ?? 0) > availableTrainings.length && (
                    <details className="group">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Paid/Completed Levels ({(trainingProgress?.trainings.length ?? 0) - availableTrainings.length})
                          </h3>
                          <span className="text-gray-500 group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </div>
                      </summary>
                      <div className="mt-2 space-y-2 pl-4">
                        {trainingProgress?.trainings
                          .filter((t) => t.isCompleted || t.isActive)
                          .map((training) => (
                            <div
                              key={training.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  training.isCompleted ? "bg-green-500" : "bg-blue-500"
                                }`}></div>
                                <span className="font-medium text-sm">
                                  {training.trainingLevelName}
                                </span>
                                {training.displayOrder && (
                                  <Badge variant="outline" className="text-xs">
                                    Level {training.displayOrder}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {training.isCompleted && (
                                  <Badge variant="default" className="bg-green-600 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                                {training.isActive && (
                                  <Badge variant="default" className="bg-blue-600 text-xs">
                                    Active
                                  </Badge>
                                )}
                                <span className="text-sm text-gray-600">
                                  ₹{training.amount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer with Summary and Actions */}
        {!loading && !error && availableTrainings.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {/* Payment Summary */}
            {selectedLevelIds.length > 0 ? (
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      {selectedLevelIds.length} level{selectedLevelIds.length > 1 ? "s" : ""} selected
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      ₹{calculateTotalAmount().toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Button
                      onClick={handlePayment}
                      disabled={processing}
                      size="lg"
                      className="h-12 px-8 text-base"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Proceed to Pay
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-500">
                  Select one or more levels to proceed with payment
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} disabled={processing}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

