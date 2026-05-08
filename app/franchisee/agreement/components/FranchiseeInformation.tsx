interface FranchiseeInformationProps {
  franchiseData: any;
}

export default function FranchiseeInformation({
  franchiseData,
}: FranchiseeInformationProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 border-b border-border pb-2 text-base font-medium text-card-foreground">
        Franchisee Information
      </h3>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Contact Person:
          </span>
          <span className="text-sm font-medium text-card-foreground">
            {franchiseData.contactPerson}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Email:</span>
          <span className="break-all text-right text-sm text-card-foreground">
            {franchiseData.email}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Phone:</span>
          <span className="text-sm text-card-foreground">{franchiseData.phone}</span>
        </div>
        {franchiseData.dob && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Date of Birth:
            </span>
            <span className="text-sm text-card-foreground">
              {new Date(franchiseData.dob).toLocaleDateString()}
            </span>
          </div>
        )}
        {franchiseData.bloodGroup && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Blood Group:
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-sm text-card-foreground">
              {franchiseData.bloodGroup}
            </span>
          </div>
        )}
        {franchiseData.educationalQualification && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Education:
            </span>
            <span className="text-right text-sm text-card-foreground">
              {franchiseData.educationalQualification}
            </span>
          </div>
        )}
        {franchiseData.presentOccupation && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Occupation:
            </span>
            <span className="text-right text-sm text-card-foreground">
              {franchiseData.presentOccupation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
