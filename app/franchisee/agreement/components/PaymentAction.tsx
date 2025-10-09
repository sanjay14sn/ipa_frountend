import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { onboardingPayment } from "@/services/franchisee.service";

interface PaymentActionProps {
  agreementAccepted: boolean;
  isProcessingPayment: boolean;
  onPaymentSubmit: () => void;
}

export default function PaymentAction({
  agreementAccepted,
  isProcessingPayment,
  onPaymentSubmit,
}: PaymentActionProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border-2 border-primary rounded-xl p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left flex-1">
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Complete Your Registration
            </h4>
            <p className="text-sm text-gray-600">
              Finalize payment to access your franchise dashboard and begin operations.
            </p>
            {!agreementAccepted && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                ⚠ Please accept terms and conditions to proceed
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Button
              onClick={onPaymentSubmit}
              disabled={!agreementAccepted || isProcessingPayment}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-10 py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
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
