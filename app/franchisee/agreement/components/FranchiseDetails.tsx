import { Building2 } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface FranchiseDetailsProps {
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

export default function FranchiseDetails({
  franchiseData,
}: FranchiseDetailsProps) {
  return (
    <section className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        Franchise Details
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Cell label="Franchise Name" className="sm:col-span-2 lg:col-span-1">
          <span className="text-base font-semibold">{franchiseData.name}</span>
        </Cell>
        {franchiseData.franchiseCode && (
          <Cell label="Code" className="sm:col-span-2 lg:col-span-2">
            <span className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
              <span className="truncate">{franchiseData.franchiseCode}</span>
            </span>
          </Cell>
        )}
        {franchiseData.program && (
          <Cell label="Programs">{franchiseData.program}</Cell>
        )}
        {franchiseData.franchiseType && (
          <Cell label="Type">{franchiseData.franchiseType}</Cell>
        )}
        {franchiseData.reference && (
          <Cell label="Reference">{franchiseData.reference}</Cell>
        )}
        {franchiseData.date && (
          <Cell label="Applied">
            {formatDate(franchiseData.date)}
          </Cell>
        )}
        {franchiseData.dob && (
          <Cell label="DOB">
            {formatDate(franchiseData.dob)}
          </Cell>
        )}
        {franchiseData.paymentDetails?.dateOfJoining && (
          <Cell label="DOJ">
            {formatDate(franchiseData.paymentDetails.dateOfJoining)}
          </Cell>
        )}
      </div>
    </section>
  );
}
