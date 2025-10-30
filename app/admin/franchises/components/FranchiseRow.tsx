import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  IndianRupee,
} from "lucide-react";
import FranchiseDetails from "./FranchiseDetails";
import { FranchiseData } from "@/services/franchisee.service";

interface FranchiseRowProps {
  client: FranchiseData;
  isExpanded: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onClientUpdate?: (updatedClient: FranchiseData) => void;
}

export default function FranchiseRow({
  client,
  lastRow,
  isExpanded,
  expandedRows,
  onToggleRow,
  onClientUpdate,
}: FranchiseRowProps) {
  return (
    <div key={client.id}>
      {/* Main Row */}
      <div
        className={`grid grid-cols-12 gap-4 p-2 items-center ${
          lastRow ? "" : "border-b"
        }`}
      >
        <div className="col-span-3 flex items-center gap-1">
          <button
            onClick={() => onToggleRow(client.id.toString())}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="flex flex-row gap-2">
            <div className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">
              {client.name}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-green-600 font-medium">
                ₹{(
                  (client.franchisePayrolls?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) ||
                   client.franchisePayroll?.totalAmount || 0) / 1000
                ).toFixed(0)}K/mo
              </span>
            </div>
          </div>
        </div>
        <div className="col-span-2 text-gray-700 text-center flex items-center justify-center">
          {client.type}
        </div>
        <div className="col-span-2 text-gray-700 text-center flex items-center justify-center">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">
            {client.franchisePrograms?.map((fp) => fp.program.name).join(", ") || "N/A"}
          </div>
        </div>
        <div className="col-span-2 text-gray-700 text-center flex items-center justify-center">
          {new Date(client.createdAt).toLocaleDateString()}
        </div>
        <div className="col-span-2 text-center flex items-center justify-center">
          <Badge
            variant={client.status === "Active" ? "default" : "secondary"}
            className="bg-green-100 text-green-800"
          >
            {client.status}
          </Badge>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <FranchiseDetails
          client={client}
          lastRow={lastRow}
          expandedRows={expandedRows}
          onToggleRow={onToggleRow}
          onClientUpdate={onClientUpdate}
        />
      )}
    </div>
  );
}
