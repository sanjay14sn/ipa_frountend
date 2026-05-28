"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TableLoadingState, TablePageShell } from "@/components/shared";
import {
  abandonCIReceivablePayment,
  getCIAgreement,
  initiateCIReceivablePayment,
  listCIReceivables,
  verifyCIReceivablePayment,
  type CITrainingReceivable,
} from "@/services/ci-training.service";
import { CheckCircle, CreditCard } from "lucide-react";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { formatRupees } from "@/lib/currency-utils";

function statusBadge(status: CITrainingReceivable["status"]) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3.5 w-3.5" />Paid</Badge>;
  if (status === "waived") return <Badge variant="secondary">Waived</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

export default function CITrainingReceivablesPage() {
  const [payingId, setPayingId] = useState<number | null>(null);
  const pendingPayRef = useRef<{ orderId: string; paymentId?: number } | null>(null);
  const isPaymentSettledRef = useRef(false);
  const checkoutOpenedRef = useRef(false);

  const { data: receivables = [], isLoading, refetch } = useQuery({
    queryKey: ["ci-receivables"],
    queryFn: listCIReceivables,
  });
  const { data: agreement, isLoading: isAgreementLoading } = useQuery({
    queryKey: ["ci-agreement"],
    queryFn: getCIAgreement,
  });

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const isAgreementValid = useMemo(() => {
    if (!agreement) return false;
    if (agreement.phase !== "SIGNED") return false;
    if (!agreement.validFrom || !agreement.validUntil) return false;
    return agreement.validFrom <= today && today <= agreement.validUntil;
  }, [agreement, today]);

  const sortedReceivables = useMemo(
    () => [...receivables].sort((a, b) => a.receivableOrder - b.receivableOrder),
    [receivables],
  );

  const nextPayableId = useMemo(() => {
    for (const r of sortedReceivables) {
      if (r.status === "pending") return r.id;
      if (r.status !== "paid" && r.status !== "waived") break;
    }
    return null;
  }, [sortedReceivables]);

  const settledCount = useMemo(
    () => receivables.filter((r) => r.status === "paid" || r.status === "waived").length,
    [receivables],
  );

  const abandonPendingPayment = (note = "page_unload") => {
    const pending = pendingPayRef.current;
    if (!pending || isPaymentSettledRef.current || !checkoutOpenedRef.current) return;
    isPaymentSettledRef.current = true;
    void abandonCIReceivablePayment({
      paymentId: pending.paymentId,
      razorpayOrderId: pending.orderId,
      note,
    }).catch(() => {});
  };

  useEffect(() => {
    const handleBeforeUnload = () => abandonPendingPayment();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      abandonPendingPayment("component_unmount");
    };
  }, []);

  const ensureRazorpayLoaded = async () => {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK")), { once: true });
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

  const handlePay = async (receivableId: number) => {
    if (payingId != null) return;
    if (!isAgreementValid) {
      toast.error("Sign a valid CI agreement before paying.");
      return;
    }
    setPayingId(receivableId);
    isPaymentSettledRef.current = false;
    checkoutOpenedRef.current = false;
    pendingPayRef.current = null;
    let payResponse: Awaited<ReturnType<typeof initiateCIReceivablePayment>> | null = null;

    try {
      payResponse = await initiateCIReceivablePayment(receivableId);
      if (!payResponse.key || !payResponse.orderId || !Number.isFinite(Number(payResponse.amount))) {
        throw new Error("Payment order details are incomplete.");
      }
      pendingPayRef.current = { orderId: payResponse.orderId, paymentId: payResponse.paymentId };

      await ensureRazorpayLoaded();
      if (!window.Razorpay) throw new Error("Payment gateway unavailable");

      const Razorpay = window.Razorpay;
      await new Promise<void>((resolve, reject) => {
        const settleAndAbandon = async (note: string) => {
          if (isPaymentSettledRef.current || !payResponse) return;
          isPaymentSettledRef.current = true;
          await abandonCIReceivablePayment({
            paymentId: payResponse.paymentId,
            razorpayOrderId: payResponse.orderId,
            note,
          }).catch(() => {});
        };

        const rzp = new Razorpay({
          key: payResponse!.key,
          amount: Math.round(Number(payResponse!.amount) * 100),
          currency: payResponse!.currency,
          order_id: payResponse!.orderId,
          handler: async (response: any) => {
            try {
              await verifyCIReceivablePayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
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
              await settleAndAbandon("dismissed");
              reject(new Error("dismissed"));
            },
          },
        });

        rzp.on("payment.failed", async (response: any) => {
          const code = response?.error?.code ?? "unknown";
          const description = response?.error?.description ?? "Payment failed";
          await settleAndAbandon(`failed:${code}`);
          void refetch();
          toast.error(description);
          reject(new Error("payment_failed"));
        });

        checkoutOpenedRef.current = true;
        rzp.open();
      });
    } catch (error: any) {
      const message = error?.message;
      if (message !== "dismissed" && message !== "payment_failed") {
        const apiMessage = getUserFriendlyMessage(error, "Unable to complete payment.");
        abandonPendingPayment();
        toast.error(apiMessage as string);
      }
    } finally {
      pendingPayRef.current = null;
      checkoutOpenedRef.current = false;
      setPayingId(null);
    }
  };

  return (
    <TablePageShell
      title="Training receivables"
      description="Pay your CI training receivables to unlock upcoming training levels."
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,1.4fr)_auto] sm:items-center">
          <div className="text-sm font-medium text-card-foreground">
            {settledCount} of {receivables.length} receivables settled
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: receivables.length
                  ? `${Math.round((settledCount / receivables.length) * 100)}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {!isAgreementLoading && !isAgreementValid ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          CI agreement is not signed/valid. Complete it before paying receivables.{" "}
          <Link href="/ci/agreement" className="font-medium underline">
            Open agreement
          </Link>
          .
        </div>
      ) : null}

      {isLoading ? <TableLoadingState message="Loading receivables..." /> : null}

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {sortedReceivables.map((r) => {
          const isNextPayable = r.id === nextPayableId;
          const isBlocked = r.status === "pending" && !isNextPayable;
          const isPayDisabled = payingId != null || isBlocked || !isAgreementValid;

          return (
            <div
              key={r.id}
              className={`flex min-h-[220px] flex-col rounded-2xl border p-5 shadow-sm ${
                isBlocked
                  ? "border-border bg-muted/40 text-muted-foreground opacity-75"
                  : "border-border bg-card"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-card-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Receivable {r.receivableOrder}
                  </p>
                </div>
                {statusBadge(r.status)}
              </div>

              <div className="border-t border-border pt-4 text-sm">
                <div className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-2">
                  <span className="text-muted-foreground">Levels</span>
                  <span className="text-card-foreground">
                    {r.levelFrom} – {r.levelTo}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                <div>
                  <span className="text-2xl font-semibold text-card-foreground">
                    {formatRupees(r.fee)}
                  </span>
                </div>
                {r.status === "pending" ? (
                  <Button
                    className="min-w-28"
                    onClick={() => handlePay(r.id)}
                    disabled={isPayDisabled}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {payingId === r.id ? "Processing..." : isBlocked ? "Locked" : "Pay now"}
                  </Button>
                ) : null}
              </div>

              {isBlocked ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Pay the previous receivable first to unlock this one.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {!isLoading && receivables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No receivables have been set up for your profile yet.
        </div>
      ) : null}
    </TablePageShell>
  );
}
