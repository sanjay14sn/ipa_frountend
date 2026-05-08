interface LocationDetailsProps {
  franchiseData: any;
}

export default function LocationDetails({
  franchiseData,
}: LocationDetailsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 border-b border-border pb-2 text-base font-medium text-card-foreground">
        Location Details
      </h3>
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-sm font-medium text-muted-foreground">
            Centre Address:
          </span>
          <p className="text-sm text-card-foreground">{franchiseData.address}</p>
          <p className="text-sm text-muted-foreground">
            {franchiseData.city} - {franchiseData.pincode}, {franchiseData.state}
          </p>
        </div>
        {franchiseData.communicationAddress && (
          <div>
            <span className="mb-1 block text-sm font-medium text-muted-foreground">
              Communication Address:
            </span>
            <p className="text-sm text-card-foreground">
              {franchiseData.communicationAddress}
            </p>
            {franchiseData.communicationPincode ? (
              <p className="text-xs text-muted-foreground">
                {franchiseData.communicationPincode}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
