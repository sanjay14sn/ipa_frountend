import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { FranchiseData } from "@/services/franchisee.service";
import PendingFranchiseDetails from "./PendingFranchiseDetails";

interface PendingFranchiseRowProps {
  application: FranchiseData;
  lastRow: boolean;
  isExpanded: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove: (application: FranchiseData) => void;
  onReject: (application: FranchiseData) => void;
}

export default function PendingFranchiseRow({
  application,
  lastRow,
  isExpanded,
  expandedRows,
  onToggleRow,
  onApprove,
  onReject,
}: PendingFranchiseRowProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div key={application.id}>
      {/* Main Row */}
      <div
        className={`flex flex-row items-center gap-4 p-2 ${
          lastRow ? "" : "border-b"
        }`}
      >
        <div className="flex-1 flex items-center ml-2">
          <button
            onClick={() => onToggleRow(application.id.toString())}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div>
            <div className="font-medium text-gray-900">{application.name}</div>
          </div>
        </div>
        <div className="flex-1 text-gray-700 text-center flex items-center justify-center">
          {application.franchisePrograms?.map((fp) => fp.program.name).join(", ") || "N/A"}
        </div>
        <div className="flex-1 text-gray-700 text-center flex items-center justify-center">
          {application.type}
        </div>
        <div className="flex-1 text-gray-700 text-center flex items-center justify-center">
          {formatDate(application.createdAt)}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {application.status}
          </Badge>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onApprove(application)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReject(application)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <PendingFranchiseDetails
          application={application}
          expandedRows={expandedRows}
          onToggleRow={onToggleRow}
        />
      )}
    </div>
  );
}
