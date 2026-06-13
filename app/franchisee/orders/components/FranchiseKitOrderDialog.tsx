"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
  AppDialogFooter,
} from "@/components/shared/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { queryKeys } from "@/hooks/api/query-keys";
import { useProgramId } from "@/hooks/use-scope";
import { getMyFranchiseKit } from "@/services/inventory.service";
import {
  initiateFranchiseKitPayment,
  previewFranchiseKitOrder,
  type FranchiseKitOrderItem,
  type OrderPaymentResponse,
} from "@/services/order-franchisee.service";

interface FranchiseKitOrderDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Zero-amount orders are created immediately (isZeroAmount=true); otherwise
   * the parent opens Razorpay with this payment data and creates the order
   * after verification via `createFranchiseKitOrder`.
   */
  onPaymentInitiated: (
    data: OrderPaymentResponse & {
      kind: "FRANCHISE_KIT";
      programId: number;
      franchiseKitItems: FranchiseKitOrderItem[];
    },
  ) => void;
}

export default function FranchiseKitOrderDialog({
  open,
  onClose,
  onPaymentInitiated,
}: FranchiseKitOrderDialogProps) {
  const programId = useProgramId();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const kitQuery = useQuery({
    queryKey: queryKeys.inventory.myFranchiseKit(programId ?? 0),
    queryFn: () => getMyFranchiseKit(programId!),
    enabled: open && programId != null,
  });
  const kitItems = useMemo(
    () => (kitQuery.data ?? []).filter((row) => row.selected && row.isActive),
    [kitQuery.data],
  );

  useEffect(() => {
    if (!open) {
      setQuantities({});
      setNotes("");
    }
  }, [open]);

  const selectedItems: FranchiseKitOrderItem[] = useMemo(
    () =>
      kitItems
        .filter((row) => (quantities[row.inventoryId] ?? 0) > 0)
        .map((row) => ({
          inventoryItemId: row.inventoryId,
          quantity: quantities[row.inventoryId]!,
        })),
    [kitItems, quantities],
  );

  const estimatedTotal = useMemo(
    () =>
      kitItems.reduce(
        (sum, row) =>
          sum + row.effectiveUnitPrice * (quantities[row.inventoryId] ?? 0),
        0,
      ),
    [kitItems, quantities],
  );

  const setQuantity = (inventoryId: number, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [inventoryId]: Math.max(0, Math.floor(value) || 0),
    }));
  };

  const handleSubmit = async () => {
    if (programId == null) {
      toast.error("Select a program before ordering.");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to order.");
      return;
    }
    setSubmitting(true);
    try {
      // Server-priced preview is the authoritative total for payment.
      const preview = await previewFranchiseKitOrder(programId, selectedItems);
      const paymentData = await initiateFranchiseKitPayment({
        programId,
        items: selectedItems,
        totalAmount: preview.totalAmount,
        notes: notes.trim() || undefined,
      });
      if (paymentData.isZeroAmount) {
        toast.success("Franchise kit order placed.");
      }
      onPaymentInitiated({
        ...paymentData,
        kind: "FRANCHISE_KIT",
        programId,
        franchiseKitItems: selectedItems,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, "Failed to start the order."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(v) => !v && onClose()} size="lg" scrollBody>
      <AppDialogHeader
        title="Order Franchise Kit Items"
        description="Re-order items from your franchise kit. Prices are specific to your franchise."
        icon={Package}
        sticky
      />
      <AppDialogBody>
        {programId == null ? (
          <p className="rounded-lg border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Select a program from the switcher to order its franchise kit.
          </p>
        ) : kitQuery.isLoading ? (
          <div className="flex items-center gap-2 px-1 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your franchise kit...
          </div>
        ) : kitItems.length === 0 ? (
          <p className="rounded-lg border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            No franchise kit items are configured for this program yet.
            Please contact the admin.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Unit price
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Quantity
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {kitItems.map((row) => {
                    const qty = quantities[row.inventoryId] ?? 0;
                    return (
                      <tr key={row.inventoryId} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.name}</span>
                            {row.sku ? (
                              <Badge variant="outline" className="text-[10px]">
                                {row.sku}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.category ?? "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          ₹{row.effectiveUnitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="mx-auto flex w-fit items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setQuantity(row.inventoryId, qty - 1)
                              }
                              disabled={submitting || qty === 0}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(event) =>
                                setQuantity(
                                  row.inventoryId,
                                  Number(event.target.value),
                                )
                              }
                              className="h-8 w-16 text-center"
                              disabled={submitting}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setQuantity(row.inventoryId, qty + 1)
                              }
                              disabled={submitting}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {qty > 0
                            ? `₹${(row.effectiveUnitPrice * qty).toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label
                htmlFor="franchise-kit-notes"
                className="text-xs font-medium text-muted-foreground"
              >
                Notes (optional)
              </label>
              <Textarea
                id="franchise-kit-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything the dispatch team should know"
                className="mt-1"
                rows={2}
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </AppDialogBody>
      <AppDialogFooter
        sticky
        leftSlot={
          <span className="text-sm text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground">
              ₹{estimatedTotal.toFixed(2)}
            </span>
          </span>
        }
        secondary={{
          label: "Cancel",
          variant: "outline",
          onClick: onClose,
          disabled: submitting,
        }}
        primary={{
          label:
            estimatedTotal > 0 ? "Proceed to payment" : "Place order",
          onClick: () => void handleSubmit(),
          loading: submitting,
          disabled: selectedItems.length === 0,
        }}
      />
    </AppDialog>
  );
}
