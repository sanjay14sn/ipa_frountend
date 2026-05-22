"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getCIMaterialsPreview,
  createCIMaterialsOrder,
  CIMaterialsPreview,
} from "@/services/order.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  DialogStateMessage,
} from "@/components/shared/dialog";

interface RequestMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  onSuccess?: () => void;
}

export function RequestMaterialsModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onSuccess,
}: RequestMaterialsModalProps) {
  const [preview, setPreview] = useState<CIMaterialsPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      setPreview(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, instructorId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const previewData = await getCIMaterialsPreview(instructorId);
      setPreview(previewData);
    } catch (err: any) {
      setError(getUserFriendlyMessage(err, "Failed to load materials preview"));
      console.error("Error loading materials preview:", err);
    } finally {
      setLoading(false);
    }
  };

  const canPlaceRequest =
    preview &&
    !preview.hasExistingOrder &&
    preview.inventoryItems.length > 0;

  const handleConfirm = async () => {
    if (!canPlaceRequest) return;

    try {
      setSubmitting(true);
      setError(null);
      await createCIMaterialsOrder(instructorId);
      toast.success("Materials order created successfully!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage = getUserFriendlyMessage(
        err,
        "Failed to create materials order",
      );
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error creating materials order:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={onClose}
      size="lg"
      padding="flush"
      scrollBody
    >
      <AppDialogHeader
        title="Request Training Materials"
        description={`Request materials for ${instructorName}'s active training level`}
        icon={Package}
        sticky
      />

      <AppDialogBody className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error && !preview ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : preview ? (
          <>
            {preview.hasExistingOrder && (
              <DialogStateMessage
                tone="success"
                icon={CheckCircle}
                title="Materials have already been ordered for this training level."
              />
            )}

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Training Level</p>
                  <p className="font-semibold text-lg text-card-foreground">{preview.trainingLevel.name}</p>
                  {preview.trainingLevel.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {preview.trainingLevel.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Active
                </Badge>
              </div>
            </div>

            {preview.inventoryItems.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-card-foreground">
                  Materials to be Ordered ({preview.inventoryItems.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-green">
                  {preview.inventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg bg-card flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-card-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg flex items-center gap-1 text-card-foreground">
                          <IndianRupee className="h-4 w-4" />
                          0.00
                        </p>
                        <p className="text-xs text-muted-foreground">Included in training fee</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No materials available for request for this training level.
                </AlertDescription>
              </Alert>
            )}

            {preview.inventoryItems.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-card-foreground">Total Amount</span>
                  <div className="flex items-center gap-1 text-xl font-bold text-primary">
                    <IndianRupee className="h-5 w-5" />
                    0.00
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Materials are included in the training fee
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : null}
      </AppDialogBody>

      <AppDialogFooter
        sticky
        padded
        secondary={{
          label: preview?.hasExistingOrder ? "Close" : "Cancel",
          onClick: onClose,
          disabled: submitting,
        }}
        primary={
          canPlaceRequest
            ? {
                label: "Confirm Request",
                onClick: handleConfirm,
                loading: submitting,
                icon: Package,
              }
            : undefined
        }
      />
    </AppDialog>
  );
}
