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

  // Check if paymentDetails is an array (per-program) or single object (legacy)
  const isPerProgram = Array.isArray(paymentDetails);

  // For summary, only sum the currency values, not percentages
  const summary = isPerProgram
    ? paymentDetails.reduce((acc: any, p: any) => ({
        franchiseFee: (acc.franchiseFee || 0) + (p.franchiseFee || 0),
        monthlyFee: (acc.monthlyFee || 0) + (p.monthlyFee || 0),
        kitCost: (acc.kitCost || 0) + (p.kitCost || 0),
        materialCost: (acc.materialCost || 0) + (p.materialCost || 0),
        installment: (acc.installment || 0) + (p.installment || 0),
        totalAmount: (acc.totalAmount || 0) + (p.totalAmount || 0),
      }), { franchiseFee: 0, monthlyFee: 0, kitCost: 0, materialCost: 0, installment: 0, totalAmount: 0 })
    : paymentDetails;

  return (
    <div className="border-2 border-primary rounded-lg p-5 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-primary">
        Payment Breakdown
      </h3>

      {/* Per-Program Breakdown */}
      {isPerProgram && paymentDetails.length > 1 && (
        <div className="mb-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Program-wise Breakdown:</p>
          {paymentDetails.map((program: any, idx: number) => (
            <div key={idx} className="bg-primary/5 p-4 rounded-lg border border-primary">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {program.program?.name || `Program ${idx + 1}`}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Franchise Fee:</span>
                  <span className="font-semibold text-gray-900">₹{fmt(program.franchiseFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kit Cost:</span>
                  <span className="font-semibold text-gray-900">₹{fmt(program.kitCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Material Cost:</span>
                  <span className="font-semibold text-gray-900">₹{fmt(program.materialCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Fee:</span>
                  <span className="font-semibold text-gray-900">₹{fmt(program.monthlyFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Installment:</span>
                  <span className="font-semibold text-gray-900">₹{fmt(program.installment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Royalty (%):</span>
                  <span className="font-semibold text-gray-900">{fmt(program.royalty)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CI Share (%):</span>
                  <span className="font-semibold text-gray-900">{fmt(program.ciShare)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Franchise Share (%):</span>
                  <span className="font-semibold text-gray-900">{fmt(program.franchiseShare)}%</span>
                </div>
              </div>
            </div>
          ))}
          <div className="border-t-2 border-primary pt-3 mt-4">
            <p className="text-sm font-semibold text-gray-900">Combined Summary:</p>
          </div>
        </div>
      )}

      {/* Total Franchise Fee to Pay */}
      <div className="flex justify-between items-center pt-5 mt-5 border-t-2 border-primary bg-primary/5 px-4 py-3 rounded-lg">
        <span className="text-base font-bold text-gray-900">
          Total Franchise Fee (Payable Now):
        </span>
        <span className="text-2xl font-bold text-primary">
          ₹{fmt(summary.franchiseFee)}
        </span>
      </div>
    </div>
  );
}
