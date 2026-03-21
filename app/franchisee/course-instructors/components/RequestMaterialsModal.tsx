"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getCIMaterialsPreview,
  createCIMaterialsOrder,
  CIMaterialsPreview,
} from "@/services/order.service";
import { toast } from "sonner";

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
      // Reset state when modal closes
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
      setError(err.message || "Failed to load materials preview");
      console.error("Error loading materials preview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || preview.hasExistingOrder) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createCIMaterialsOrder(instructorId);
      toast.success("Materials order created successfully!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create materials order";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error creating materials order:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Request Training Materials
          </DialogTitle>
          <DialogDescription>
            Request materials for {instructorName}'s active training level
          </DialogDescription>
        </DialogHeader>

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
          <div className="space-y-4">
            {/* Already Ordered Alert */}
            {preview.hasExistingOrder && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Materials have already been ordered for this training level.
                </AlertDescription>
              </Alert>
            )}

            {/* Training Level Info */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Training Level</p>
                  <p className="font-semibold text-lg">{preview.trainingLevel.name}</p>
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

            {/* Materials List */}
            {preview.inventoryItems.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">
                  Materials to be Ordered ({preview.inventoryItems.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {preview.inventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 rounded-lg bg-white flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
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
                        <p className="font-semibold text-lg flex items-center gap-1">
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
                  No materials available for this training level.
                </AlertDescription>
              </Alert>
            )}

            {/* Total Amount */}
            {preview.inventoryItems.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Amount</span>
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

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {preview?.hasExistingOrder ? "Close" : "Cancel"}
          </Button>
          {preview && !preview.hasExistingOrder && preview.inventoryItems.length > 0 && (
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Confirm Request
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
