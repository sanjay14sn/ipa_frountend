interface FranchiseDetailsProps {
  franchiseData: any;
}

export default function FranchiseDetails({
  franchiseData,
}: FranchiseDetailsProps) {
  return (
    <div className="border-2 border-primary rounded-lg p-5 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-primary">
        Franchise Details
      </h3>
      <div className="space-y-3">
        <div>
          <span className="text-sm font-medium text-gray-600 block mb-1">
            Franchise Name:
          </span>
          <p className="text-base font-semibold text-gray-900">
            {franchiseData.name}
          </p>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">Code:</span>
          <span className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-900">
            {franchiseData.franchiseCode}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">Programs:</span>
          <span className="text-sm text-gray-900">{franchiseData.program}</span>
        </div>
        {franchiseData.franchiseType && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">Type:</span>
            <span className="text-sm text-gray-900">
              {franchiseData.franchiseType}
            </span>
          </div>
        )}
        {franchiseData.reference && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">
              Reference:
            </span>
            <span className="text-sm text-gray-900">
              {franchiseData.reference}
            </span>
          </div>
        )}
        {franchiseData.date && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">Applied:</span>
            <span className="text-sm text-gray-900">
              {new Date(franchiseData.date).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.dob && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">DOB:</span>
            <span className="text-sm text-gray-900">
              {new Date(franchiseData.dob).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.paymentDetails?.dateOfJoining && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">DOJ:</span>
            <span className="text-sm text-gray-900">
              {new Date(
                franchiseData.paymentDetails.dateOfJoining
              ).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
