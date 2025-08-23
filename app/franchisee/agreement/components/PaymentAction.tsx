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
    <div className="bg-gray-50 border border-primary rounded-lg p-6 ">
      <div className="text-center">
        <h4 className="font-semibold text-gray-900 mb-3">
          Complete Registration
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Finalize payment to access your franchise dashboard and begin
          operations.
        </p>
        <Button
          onClick={onPaymentSubmit}
          disabled={!agreementAccepted || isProcessingPayment}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          {isProcessingPayment ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Complete Payment
            </>
          )}
        </Button>
        {!agreementAccepted && (
          <p className="text-xs text-gray-500 mt-2">
            Please accept terms and conditions to proceed
          </p>
        )}
      </div>
    </div>
  );
}
