import { useState } from "react";
import PendingTableHeader from "./PendingTableHeader";
import PendingFranchiseRow from "./PendingFranchiseRow";
import { FranchiseData } from "@/services/franchisee.service";

interface PendingCardComponentProps {
  applications: FranchiseData[];
  onApprove: (application: FranchiseData) => void;
  onReject: (application: FranchiseData) => void;
}

export default function PendingCardComponent({
  applications,
  onApprove,
  onReject,
}: PendingCardComponentProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className=" rounded-lg shadow-sm border border-primary/80">
      <div className="p-1 ">
        <PendingTableHeader />
      </div>
      {applications.map((application, index) => (
        <PendingFranchiseRow
          key={application.id}
          lastRow={index === applications.length - 1}
          application={application}
          isExpanded={expandedRows.has(application.id.toString())}
          expandedRows={expandedRows}
          onToggleRow={toggleRow}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
