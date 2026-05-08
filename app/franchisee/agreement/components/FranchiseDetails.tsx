interface FranchiseDetailsProps {
  franchiseData: any;
}

export default function FranchiseDetails({
  franchiseData,
}: FranchiseDetailsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 border-b border-border pb-2 text-base font-medium text-card-foreground">
        Franchise Details
      </h3>
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-sm font-medium text-muted-foreground">
            Franchise Name:
          </span>
          <p className="text-base font-semibold text-card-foreground">
            {franchiseData.name}
          </p>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Code:</span>
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm text-card-foreground">
            {franchiseData.franchiseCode}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Programs:</span>
          <span className="text-sm text-card-foreground">{franchiseData.program}</span>
        </div>
        {franchiseData.franchiseType && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Type:</span>
            <span className="text-sm text-card-foreground">
              {franchiseData.franchiseType}
            </span>
          </div>
        )}
        {franchiseData.reference && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Reference:
            </span>
            <span className="text-sm text-card-foreground">
              {franchiseData.reference}
            </span>
          </div>
        )}
        {franchiseData.date && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Applied:</span>
            <span className="text-sm text-card-foreground">
              {new Date(franchiseData.date).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.dob && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">DOB:</span>
            <span className="text-sm text-card-foreground">
              {new Date(franchiseData.dob).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.paymentDetails?.dateOfJoining && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">DOJ:</span>
            <span className="text-sm text-card-foreground">
              {new Date(
                franchiseData.paymentDetails.dateOfJoining,
              ).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
