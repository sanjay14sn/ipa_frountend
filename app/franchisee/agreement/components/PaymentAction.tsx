import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface PaymentActionProps {
  agreementAccepted: boolean;
  isProcessingPayment: boolean;
  onPaymentSubmit: () => void;
  /** When set, payment is blocked and this message is shown (e.g. signature / loading). */
  signatureHint?: string | null;
  /** Shown on agreement onboarding step 4 */
  variant?: "default" | "final";
}

export default function PaymentAction({
  agreementAccepted,
  isProcessingPayment,
  onPaymentSubmit,
  signatureHint,
  variant = "default",
}: PaymentActionProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex-1 text-center md:text-left">
            <h4 className="mb-2 text-lg font-normal text-card-foreground">
              {variant === "final"
                ? "Activate your franchise"
                : "Complete your registration"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {variant === "final"
                ? "Complete your signed agreement payment to unlock your dashboard. Activation happens after the backend verifies the payment."
                : "Finalize payment to access your franchise dashboard and begin operations."}
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
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
