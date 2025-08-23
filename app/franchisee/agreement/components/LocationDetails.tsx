interface LocationDetailsProps {
  franchiseData: any;
}

export default function LocationDetails({
  franchiseData,
}: LocationDetailsProps) {
  return (
    <div className="pb-4 border-b border-primary">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 underline">
        Location Details
      </h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium text-gray-600 block mb-1">
            Centre Address:
          </span>
          <p className="text-sm text-gray-900">{franchiseData.address}</p>
          <p className="text-xs text-gray-600">
            {franchiseData.city}, {franchiseData.pincode}
          </p>
        </div>
        {franchiseData.communicationAddress && (
          <div>
            <span className="text-sm font-medium text-gray-600 block mb-1">
              Communication Address:
            </span>
            <p className="text-sm text-gray-900">
              {franchiseData.communicationAddress}
            </p>
            <p className="text-xs text-gray-600">
              {franchiseData.communicationPincode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
