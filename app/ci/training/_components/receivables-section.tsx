"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TablePageShell, StatusBadge, CardListSkeleton, EmptyState } from "@/components/shared";
import {
  abandonCIReceivablePayment,
  initiateCIReceivablePayment,
  isUnsettledCIReceivable,
  listCIReceivables,
  verifyCIReceivablePayment,
  type CIReceivablePayResponse,
  type CITrainingReceivable,
} from "@/services/ci-training.service";
import { listMyCIAgreements } from "@/services/contracting.service";
import { useCIAuth } from "@/context/ci-auth-context";
import { CreditCard, Loader2 } from "lucide-react";
import { getErrorMessage, getUserFriendlyMessage } from "@/lib/error-utils";
import { formatRupees } from "@/lib/currency-utils";
import { Progress } from "@/components/ui/progress";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { type RazorpaySuccessResponse } from "@/components/RazorpayPayment";

const RazorpayPayment = dynamic(
  () => import("@/components/RazorpayPayment"),
  { ssr: false, loading: () => <Loader2 className="h-5 w-5 animate-spin" /> },
);

function statusBadge(status: CITrainingReceivable["status"]) {
  if (status === "paid") return <StatusBadge label="Paid" />;
  if (status === "waived") return <Badge variant="secondary">Waived</Badge>;
  if (status === "due") return <Badge variant="outline">Due</Badge>;
  if (status === "scheduled") return <Badge variant="outline">Scheduled</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

// CI-02: title-stripped tab section — the /ci/training hub owns the header (R6).
export function ReceivablesSection() {
  const { user } = useCIAuth();
  const [initiatingId, setInitiatingId] = useState<number | null>(null);
  const [paymentDetails, setPaymentDetails] =
    useState<CIReceivablePayResponse | null>(null);

  const { data: receivables = [], isLoading, refetch } = useQuery({
    queryKey: ["ci-receivables"],
    queryFn: listCIReceivables,
  });
  const { data: agreements, isLoading: isAgreementLoading } = useQuery({
    queryKey: ["ci-agreements", "mine"],
    queryFn: listMyCIAgreements,
  });

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Multi-franchise: ANY active, unexpired agreement unlocks payment —
  // training fees hang off the handler agreement and the server enforces
  // payability regardless.
  const isAgreementValid = useMemo(() => {
    return (agreements ?? []).some((agreement) => {
      if (agreement.status !== "ACTIVE") return false;
      // expiresAt null = unlimited or not yet derived.
      if (!agreement.expiresAt) return true;
      return today <= agreement.expiresAt;
    });
  }, [agreements, today]);

  const sortedReceivables = useMemo(
    () => [...receivables].sort((a, b) => a.receivableOrder - b.receivableOrder),
    [receivables],
  );

  // Sequential unlock (enforced server-side too): the FIRST unsettled item is
  // the only payable one, whatever its unsettled status (pending/due/scheduled).
  const nextPayableId = useMemo(
    () => sortedReceivables.find(isUnsettledCIReceivable)?.id ?? null,
    [sortedReceivables],
  );

  const settledCount = useMemo(
    () => receivables.filter((r) => !isUnsettledCIReceivable(r)).length,
    [receivables],
  );

  const handlePay = async (receivableItemId: number) => {
    if (initiatingId != null || paymentDetails != null) return;
    if (!isAgreementValid) {
      toast.error("Sign a valid CI agreement before paying.");
      return;
    }
    setInitiatingId(receivableItemId);
    try {
      const order = await initiateCIReceivablePayment(receivableItemId);
      if (!order.razorpayOrderId || !Number.isFinite(Number(order.amount))) {
        throw new Error("Payment order details are incomplete.");
      }
      setPaymentDetails(order);
    } catch (error) {
      toast.error(
        getUserFriendlyMessage(error, "Unable to start payment.") as string,
      );
    } finally {
      setInitiatingId(null);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    try {
      await verifyCIReceivablePayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
      toast.success("Payment successful");
    } catch (error) {
      toast.error(getErrorMessage(error, "Payment verification failed"));
    } finally {
      setPaymentDetails(null);
      void refetch();
    }
  };

  const handlePaymentFailure = (error: unknown) => {
    toast.error(getErrorMessage(error, "Payment was not completed"));
    setPaymentDetails(null);
    void refetch();
  };

  return (
    <TablePageShell embed>
      {paymentDetails ? (
        <ComponentErrorBoundary componentName="RazorpayPayment">
          <RazorpayPayment
            key={paymentDetails.razorpayOrderId}
            orderId={paymentDetails.razorpayOrderId}
            amount={paymentDetails.amount}
            currency={paymentDetails.currency}
            franchiseName="CI Training"
            razorpayKey={paymentDetails.keyId}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onAbandon={async ({ orderId, reason }) => {
              await abandonCIReceivablePayment({
                paymentId: paymentDetails.paymentId,
                razorpayOrderId: orderId,
                note: reason,
              }).catch(() => {});
            }}
            userDetails={{
              name: user?.name ?? "",
              email: user?.email ?? "",
              phone: user?.phone ?? "",
            }}
          />
        </ComponentErrorBoundary>
      ) : null}

      <div
        data-tour="receivables-summary"
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,1.4fr)_auto] sm:items-center">
          <div className="text-sm font-medium text-card-foreground">
            {settledCount} of {receivables.length} receivables settled
          </div>
          <Progress
            className="h-2"
            value={
              receivables.length
                ? Math.round((settledCount / receivables.length) * 100)
                : 0
            }
          />
        </div>
      </div>

      {!isAgreementLoading && !isAgreementValid ? (
        <Alert variant="warning" className="text-sm">
          <AlertDescription>
            CI agreement is not signed/active. Complete it before paying
            receivables.{" "}
            <Link href="/ci/agreement" className="font-medium underline">
              Open agreement
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <CardListSkeleton /> : null}

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {sortedReceivables.map((r) => {
          const unsettled = isUnsettledCIReceivable(r);
          const isNextPayable = r.id === nextPayableId;
          const isBlocked = unsettled && !isNextPayable;
          const isPayDisabled =
            initiatingId != null ||
            paymentDetails != null ||
            isBlocked ||
            !isAgreementValid;

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
                    {r.trainingLevelIds && r.trainingLevelIds.length > 0
                      ? r.trainingLevelIds
                          .slice()
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((l) => l.code || l.name)
                          .join(", ")
                      : `${r.levelFrom} – ${r.levelTo}`}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                <div>
                  <span className="text-2xl font-semibold text-card-foreground">
                    {formatRupees(r.fee)}
                  </span>
                </div>
                {unsettled ? (
                  <Button
                    className="min-w-28"
                    onClick={() => handlePay(r.id)}
                    disabled={isPayDisabled}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {initiatingId === r.id ? "Processing..." : isBlocked ? "Locked" : "Pay now"}
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
        <div className="rounded-xl border border-border bg-card">
          <EmptyState title="No receivables yet" hint="No receivables have been set up for your profile yet" />
        </div>
      ) : null}
    </TablePageShell>
  );
}
