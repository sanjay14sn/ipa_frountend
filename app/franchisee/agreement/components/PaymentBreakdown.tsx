interface PaymentBreakdownProps {
  paymentDetails: any;
}

export default function PaymentBreakdown({
  paymentDetails,
}: PaymentBreakdownProps) {
  if (!paymentDetails) return null;

  const fmt = (n: number | string | undefined | null) =>
    typeof n === "number"
      ? n.toLocaleString()
      : Number(n || 0).toLocaleString();

  return (
    <div className="pb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 underline">
        Payment Breakdown
      </h3>

      {/* Two-column grid for line items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left column */}
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Franchise Fee:
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.franchiseFee)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Monthly Fee:
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.monthlyFee)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Royalty (%):
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {paymentDetails.royalty ?? 0}%
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">Kit Cost:</span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.kitCost)}
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Material Cost:
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.materialCost)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Installment:
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.installment)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">CI Share:</span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.ciShare)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-primary">
            <span className="text-sm font-medium text-gray-600">
              Franchise Share:
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{fmt(paymentDetails.franchiseShare)}
            </span>
          </div>
        </div>
      </div>

      {/* Meta dates (optional) */}
      {(paymentDetails.dateOfJoining || paymentDetails.dateOfPayment) && (
        <div className="text-xs text-gray-600 pt-2">
          {paymentDetails.dateOfJoining && (
            <div>
              DOJ: {new Date(paymentDetails.dateOfJoining).toLocaleDateString()}
            </div>
          )}
          {paymentDetails.dateOfPayment && (
            <div>
              DOP: {new Date(paymentDetails.dateOfPayment).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Full-width total */}
      <div className="flex justify-between items-center pt-3 mt-2 border-t border-primary">
        <span className="text-base font-semibold text-gray-900">
          Total Amount:
        </span>
        <span className="text-lg font-bold text-primary">
          ₹{fmt(paymentDetails.totalAmount)}
        </span>
      </div>
    </div>
  );
}
