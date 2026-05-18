"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TableLoadingState, TablePageShell } from "@/components/shared";
import {
  abandonCIPayment,
  getCIAgreement,
  initiateCITrainingPurchase,
  listCIPackages,
  verifyCITrainingPayment,
} from "@/services/ci-training.service";
import { CheckCircle, Layers, ShoppingCart } from "lucide-react";
import { getUserFriendlyMessage } from "@/lib/error-utils";

function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function packageCoverage(pkg: {
  trainingLevelIds: number[];
}) {
  if (pkg.trainingLevelIds.length > 0) {
    const sorted = [...pkg.trainingLevelIds].sort((a, b) => a - b);
    return `Levels ${sorted[0]} to ${sorted[sorted.length - 1]}`;
  }
  return "Level mapping available after purchase";
}

export default function CITrainingPackagesPage() {
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const pendingPurchaseRef = useRef<{ orderId: string; purchaseId: number; paymentId?: number } | null>(null);
  const isPaymentSettledRef = useRef(false);
  const checkoutOpenedRef = useRef(false);
  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ["ci-packages"],
    queryFn: listCIPackages,
  });
  const { data: agreement, isLoading: isAgreementLoading } = useQuery({
    queryKey: ["ci-agreement"],
    queryFn: getCIAgreement,
  });

  const abandonPendingPayment = (note: string = "page_unload") => {
    const pendingPurchase = pendingPurchaseRef.current;
    if (!pendingPurchase || isPaymentSettledRef.current || !checkoutOpenedRef.current) return;

    isPaymentSettledRef.current = true;
    void abandonCIPayment({
      paymentId: pendingPurchase.paymentId,
      razorpayOrderId: pendingPurchase.orderId,
      purchaseId: pendingPurchase.purchaseId,
      note,
    }).catch(() => {});
  };

  const ensureRazorpayLoaded = async () => {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK")), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const handleWindowClose = () => abandonPendingPayment();
    window.addEventListener("beforeunload", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      abandonPendingPayment("component_unmount");
    };
  }, []);

  const purchasedCount = useMemo(
    () => packages.filter((item) => item.isPurchased).length,
    [packages],
  );

  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isAgreementValid = useMemo(() => {
    if (!agreement) return false;
    if (agreement.phase !== "SIGNED") return false;
    if (!agreement.validFrom || !agreement.validUntil) return false;
    return agreement.validFrom <= today && today <= agreement.validUntil;
  }, [agreement, today]);

  const firstUnpaidOrder = useMemo(() => {
    const sorted = [...packages].sort((a, b) => a.packageOrder - b.packageOrder);
    return sorted.find((pkg) => pkg.purchaseStatus === "UNPAID")?.packageOrder ?? null;
  }, [packages]);

  const handlePurchase = async (packageId: number) => {
    if (purchasingId != null) return;
    if (!isAgreementValid) {
      toast.error("Sign a valid CI agreement before purchasing training packages.");
      return;
    }
    setPurchasingId(packageId);
    isPaymentSettledRef.current = false;
    checkoutOpenedRef.current = false;
    pendingPurchaseRef.current = null;
    let purchaseResponse: Awaited<ReturnType<typeof initiateCITrainingPurchase>> | null = null;

    try {
      purchaseResponse = await initiateCITrainingPurchase(packageId);
      if (
        !purchaseResponse.key ||
        !purchaseResponse.orderId ||
        !Number.isFinite(Number(purchaseResponse.amount))
      ) {
        throw new Error("Payment order details are incomplete.");
      }
      pendingPurchaseRef.current = {
        orderId: purchaseResponse.orderId,
        purchaseId: purchaseResponse.purchaseId,
        paymentId: purchaseResponse.paymentId,
      };

      await ensureRazorpayLoaded();
      if (!window.Razorpay) throw new Error("Payment gateway unavailable");

      const Razorpay = window.Razorpay;
      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: purchaseResponse!.key,
          amount: Math.round(Number(purchaseResponse!.amount) * 100),
          currency: purchaseResponse!.currency,
          order_id: purchaseResponse!.orderId,
          handler: async (response: any) => {
            try {
              await verifyCITrainingPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                purchaseId: purchaseResponse!.purchaseId,
              });
              isPaymentSettledRef.current = true;
              toast.success("Payment successful");
              void refetch();
              resolve();
            } catch (error: any) {
              reject(error);
            }
          },
          modal: {
            ondismiss: async () => {
              if (!purchaseResponse) return reject(new Error("dismissed"));
              isPaymentSettledRef.current = true;
              await abandonCIPayment({
                paymentId: purchaseResponse.paymentId,
                razorpayOrderId: purchaseResponse.orderId,
                purchaseId: purchaseResponse.purchaseId,
                note: "dismissed",
              }).catch(() => {});
              reject(new Error("dismissed"));
            },
          },
        });
        checkoutOpenedRef.current = true;
        rzp.open();
      });
    } catch (error: any) {
      if (error?.message !== "dismissed") {
        const apiMessage = getUserFriendlyMessage(error, "Unable to complete payment.");
        const isAgreementError =
          typeof apiMessage === "string" &&
          apiMessage.toLowerCase().includes("ci agreement must be signed and valid");
        abandonPendingPayment();
        toast.error(isAgreementError
          ? "Sign the CI agreement first, then retry purchase from this page."
          : apiMessage);
        if (pendingPurchaseRef.current && checkoutOpenedRef.current) {
          void abandonCIPayment({
            paymentId: pendingPurchaseRef.current.paymentId,
            razorpayOrderId: pendingPurchaseRef.current.orderId,
            purchaseId: pendingPurchaseRef.current.purchaseId,
            note: "init_failed",
          }).catch(() => {});
        }
      }
    } finally {
      pendingPurchaseRef.current = null;
      checkoutOpenedRef.current = false;
      setPurchasingId(null);
    }
  };

  return (
    <TablePageShell
      title="Training packages"
      description="Purchase CI training packages to unlock upcoming training levels."
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,1.4fr)_auto] sm:items-center">
          <div className="text-sm font-medium text-card-foreground">
            {purchasedCount} of {packages.length} packages purchased
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: packages.length
                  ? `${Math.round((purchasedCount / packages.length) * 100)}%`
                  : "0%",
              }}
            />
          </div>
          <Badge variant="outline" className="px-2 py-1">
            <Layers className="mr-1 h-3.5 w-3.5" />
            Active catalog
          </Badge>
        </div>
      </div>

      {!isAgreementLoading && !isAgreementValid ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          CI agreement is not signed/valid. Complete it before purchasing packages.{" "}
          <Link href="/ci/agreement" className="font-medium underline">
            Open agreement
          </Link>
          .
        </div>
      ) : null}

      {isLoading ? <TableLoadingState message="Loading packages..." /> : null}

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {packages.map((pkg) => {
          const isLockedBySequence =
            firstUnpaidOrder != null &&
            pkg.purchaseStatus === "UNPAID" &&
            pkg.packageOrder > firstUnpaidOrder;
          const isBuyDisabled =
            purchasingId != null ||
            pkg.purchaseStatus === "PENDING" ||
            isLockedBySequence ||
            !isAgreementValid;

          return (
          <div
            key={pkg.id}
            className={`flex min-h-[250px] flex-col rounded-2xl border p-5 shadow-sm ${
              isLockedBySequence
                ? "border-border bg-muted/40 text-muted-foreground opacity-75"
                : "border-border bg-card"
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-card-foreground">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.code} - Order {pkg.packageOrder}
                </p>
              </div>
              {pkg.purchaseStatus === "PAID" ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Purchased
                </Badge>
              ) : pkg.purchaseStatus === "PENDING" ? (
                <Badge variant="secondary">Payment pending</Badge>
              ) : isLockedBySequence ? (
                <Badge variant="secondary">Locked</Badge>
              ) : (
                <Badge variant="secondary">Available</Badge>
              )}
            </div>

            <div className="border-t border-border pt-4 text-sm">
              <div className="grid grid-cols-[42px_1fr] gap-x-2 gap-y-2">
                <span className="text-muted-foreground">Levels</span>
                <span className="text-card-foreground">{packageCoverage(pkg).replace("Levels ", "")}</span>
                <span className="text-muted-foreground">IDs</span>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.trainingLevelIds.length ? (
                    pkg.trainingLevelIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border px-1.5 text-[11px] text-card-foreground"
                      >
                        {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Not mapped</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-end justify-between gap-4 pt-7">
              <div>
                <span className="text-2xl font-semibold text-card-foreground">{money(pkg.fee)}</span>
                <p className="text-xs text-muted-foreground">
                  {pkg.trainingLevelIds.length} levels included
                </p>
              </div>
              {!pkg.isPurchased ? (
                <Button
                  className="min-w-28"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isBuyDisabled}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {purchasingId === pkg.id ? "Processing..." : isLockedBySequence ? "Locked" : "Buy now"}
                </Button>
              ) : null}
            </div>

            {isLockedBySequence ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Buy Package {firstUnpaidOrder} first to unlock this.
              </p>
            ) : null}
          </div>
        )})}
      </div>

      {!isLoading && packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No training packages have been assigned to your profile yet.
        </div>
      ) : null}
    </TablePageShell>
  );
}
