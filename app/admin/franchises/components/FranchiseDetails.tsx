import FranchiseeSection, { franchiseeDotRef } from "./FranchiseeSection";
import PayrollSection, { payrollDotRef } from "./PayrollSection";
import StartingKitSection, { startingKitDotRef } from "./StartingKitSection";
import { useEffect, useState, useRef } from "react";
import {
  FranchisePayrollResponse,
  FranchiseData,
} from "@/services/franchisee.service";

interface FranchiseDetailsProps {
  client: FranchiseData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onClientUpdate?: (updatedClient: FranchiseData) => void;
}

export default function FranchiseDetails({
  client,
  lastRow,
  expandedRows,
  onToggleRow,
  onClientUpdate,
}: FranchiseDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const franchiseDetailsDotRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  const handlePayrollUpdate = (updatedPayroll: FranchisePayrollResponse) => {
    if (onClientUpdate) {
      const updatedClient = {
        ...client,
        payrollDetails: updatedPayroll,
      };
      onClientUpdate(updatedClient);
    }
  };

  useEffect(() => {
    const calculateLineHeight = () => {
      if (!containerRef.current) return;

      const containerTop = containerRef.current.getBoundingClientRect().top;
      let lastDotRef = null;

      // Find the last visible dot (check in reverse order: startingKit, payroll, franchisee, franchiseDetails)
      if (startingKitDotRef.current) {
        lastDotRef = startingKitDotRef.current;
      } else if (payrollDotRef.current) {
        lastDotRef = payrollDotRef.current;
      } else if (franchiseeDotRef.current) {
        lastDotRef = franchiseeDotRef.current;
      } else if (franchiseDetailsDotRef.current) {
        lastDotRef = franchiseDetailsDotRef.current;
      }

      if (lastDotRef) {
        const dotCenter =
          lastDotRef.getBoundingClientRect().top + lastDotRef.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 100);

    // Recalculate on window resize
    window.addEventListener("resize", calculateLineHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", calculateLineHeight);
    };
  }, [client, expandedRows]);

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        {/* Vertical connecting line from main row */}
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Client Details */}
          <div className="relative ">
            {/* Curved horizontal connecting line with dot */}
            <div
              ref={franchiseDetailsDotRef}
              className="absolute -left-6 top-4 w-6 h-4 "
            >
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {client.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type</span>
                  <p className="text-gray-900 mt-1">{client.type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Programs</span>
                  <p className="text-gray-900 mt-1">
                    {client.franchisePrograms
                      ?.map((fp) => fp.program.name)
                      .join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">{client.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Created Date</span>
                  <p className="text-gray-900 mt-1">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated</span>
                  <p className="text-gray-900 mt-1">
                    {new Date(client.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Franchise ID</span>
                  <p className="text-gray-900 mt-1">{client.id}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Address</span>
                  <p className="text-gray-900 mt-1">{client.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Franchisee Section */}
          <FranchiseeSection
            franchisee={client.franchisee}
            clientId={client.id.toString()}
            isExpanded={expandedRows.has(`${client.id}-franchisee`)}
            onToggle={onToggleRow}
          />

          {/* Payroll Section */}
          <PayrollSection
            payrollDetails={client.franchisePayrolls || client.franchisePayroll}
            clientId={client.id.toString()}
            isExpanded={expandedRows.has(`${client.id}-payroll`)}
            onToggle={onToggleRow}
            onPayrollUpdate={handlePayrollUpdate}
          />

          {/* Starting Kit Section */}
          <StartingKitSection
            franchise={client}
            clientId={client.id.toString()}
            isExpanded={expandedRows.has(`${client.id}-starting-kit`)}
            onToggle={onToggleRow}
          />

          {/* Note: Students, Instructors, and Orders sections are commented out in the original */}
          {/* They can be uncommented and modularized similarly if needed */}
        </div>
      </div>
    </div>
  );
}
