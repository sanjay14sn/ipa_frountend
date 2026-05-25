import { Button } from "@/components/ui/button";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { GST_RATE_LABEL } from "@/lib/gst";

interface PaymentActionProps {
  agreementAccepted: boolean;
  isProcessingPayment: boolean;
  onPaymentSubmit: () => void;
  /** When set, payment is blocked and this message is shown (e.g. signature / loading). */
  signatureHint?: string | null;
  /** Shown on agreement onboarding step 4 */
  variant?: "default" | "final";
  /**
   * The actual amount about to be charged via Razorpay. Shown prominently so
   * the franchisee can see at a glance how much they owe right now. For
   * installment agreements this is the down payment / first EMI's payable;
   * for one-shot agreements it's the full fee + GST.
   */
  payableAmount?: number | null;
  /** Pre-GST principal of `payableAmount` — drives the breakdown line. */
  payablePrincipal?: number | null;
  /** GST portion of `payableAmount`. 0 / null hides the breakdown line. */
  payableGst?: number | null;
  /** Friendly description for what's being paid (e.g. "Down payment", "Installment 1"). */
  payableLabel?: string | null;
}

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

export default function PaymentAction({
  agreementAccepted,
  isProcessingPayment,
  onPaymentSubmit,
  signatureHint,
  variant = "default",
  payableAmount,
  payablePrincipal,
  payableGst,
  payableLabel,
}: PaymentActionProps) {
  const showPayableHeadline =
    payableAmount != null && Number(payableAmount) > 0;
  const showGstSplit =
    showPayableHeadline &&
    payableGst != null &&
    Number(payableGst) > 0 &&
    payablePrincipal != null;
  const isFinal = variant === "final";

  // Final step — compact, professional payment card.
  if (isFinal && showPayableHeadline) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Amount due now
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-card-foreground">
              {money(payableAmount)}
            </p>
            {payableLabel || showGstSplit ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {payableLabel ?? ""}
                {payableLabel && showGstSplit ? " · " : ""}
                {showGstSplit
                  ? `${money(payablePrincipal)} + ${GST_RATE_LABEL} ${money(
                      payableGst,
                    )}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-stretch gap-1.5 md:items-end">
            <Button
              onClick={onPaymentSubmit}
              disabled={
                !agreementAccepted ||
                isProcessingPayment ||
                Boolean(signatureHint)
              }
              className="rounded-lg px-5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-3.5 w-3.5" />
                  Pay {money(payableAmount)}
                </>
              )}
            </Button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground md:justify-end">
              <ShieldCheck className="h-3 w-3" />
              <span>Secured by Razorpay · PCI DSS</span>
            </div>
          </div>
        </div>

        {!agreementAccepted ? (
          <p className="mt-2 text-xs font-medium text-destructive">
            Please accept the terms and conditions to proceed.
          </p>
        ) : null}
        {signatureHint ? (
          <p className="mt-2 text-xs font-medium text-amber-800">{signatureHint}</p>
        ) : null}
      </div>
    );
  }

  // Default (non-final) layout — the existing compact card.
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        {showPayableHeadline ? (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border-2 border-primary/50 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                You will pay now
              </p>
              {payableLabel ? (
                <p className="mt-1 text-sm font-medium text-card-foreground">
                  {payableLabel}
                </p>
              ) : null}
              {showGstSplit ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {money(payablePrincipal)} + {GST_RATE_LABEL} {money(payableGst)}
                </p>
              ) : null}
            </div>
            <span className="text-3xl font-semibold text-primary">
              {money(payableAmount)}
            </span>
          </div>
        ) : null}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex-1 text-center md:text-left">
            <h4 className="mb-2 text-lg font-normal text-card-foreground">
              Complete your registration
            </h4>
            <p className="text-sm text-muted-foreground">
              Finalize payment to access your franchise dashboard and begin operations.
            </p>
            {!agreementAccepted && (
              <p className="mt-2 text-xs font-medium text-destructive">
                Please accept terms and conditions to proceed
              </p>
            )}
            {signatureHint ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                {signatureHint}
              </p>
            ) : null}
          </div>
          <div className="shrink-0">
            <Button
              onClick={onPaymentSubmit}
              disabled={
                !agreementAccepted ||
                isProcessingPayment ||
                Boolean(signatureHint)
              }
              size="lg"
              className="rounded-lg px-6 py-5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  {showPayableHeadline ? `Pay ${money(payableAmount)}` : "Complete Payment"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
