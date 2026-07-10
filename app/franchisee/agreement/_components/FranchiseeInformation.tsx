import { User } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface FranchiseeInformationProps {
  franchiseData: any;
}

function Cell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-card-foreground">{children}</div>
    </div>
  );
}

export default function FranchiseeInformation({
  franchiseData,
}: FranchiseeInformationProps) {
  return (
    <section className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
        <User className="h-4 w-4 text-muted-foreground" />
        Franchisee Information
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Cell label="Contact Person">{franchiseData.contactPerson}</Cell>
        <Cell label="Email" className="sm:col-span-2 lg:col-span-2">
          <span className="break-all">{franchiseData.email}</span>
        </Cell>
        <Cell label="Phone">{franchiseData.phone}</Cell>
        {franchiseData.dob && (
          <Cell label="Date of Birth">
            {formatDate(franchiseData.dob)}
          </Cell>
        )}
        {franchiseData.bloodGroup && (
          <Cell label="Blood Group">
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {franchiseData.bloodGroup}
            </span>
          </Cell>
        )}
        {franchiseData.educationalQualification && (
          <Cell label="Education">{franchiseData.educationalQualification}</Cell>
        )}
        {franchiseData.presentOccupation && (
          <Cell label="Occupation">{franchiseData.presentOccupation}</Cell>
        )}
      </div>
    </section>
  );
}
