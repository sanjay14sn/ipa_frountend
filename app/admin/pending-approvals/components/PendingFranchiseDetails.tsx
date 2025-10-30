import { FranchiseData } from "@/services/franchisee.service";
import PendingFranchiseeSection from "./PendingFranchiseeSection";
import { useEffect, useState, useRef } from "react";
import { franchiseeDotRef } from "./PendingFranchiseeSection";

interface PendingFranchiseDetailsProps {
  application: FranchiseData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
}

export default function PendingFranchiseDetails({
  application,
  expandedRows,
  onToggleRow,
}: PendingFranchiseDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current && franchiseeDotRef.current) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        franchiseeDotRef.current.getBoundingClientRect().top +
        franchiseeDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [application]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-gray-50 border-t border-black rounded-b-lg ">
      <div className="relative">
        {/* Vertical connecting line from main row */}
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Franchise Details */}
          <div className="relative ">
            {/* Curved horizontal connecting line with dot */}
            <div className="absolute -left-6 top-4 w-6 h-4 ">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
              <h3 className="font-semibold text-lg text-gray-900">
                {application.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type</span>
                  <p className="text-gray-900 mt-1">{application.type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Programs</span>
                  <p className="text-gray-900 mt-1">
                    {application.franchisePrograms
                      ?.map((fp) => fp.program.name)
                      .join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-900 mt-1">{application.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Application Date</span>
                  <p className="text-gray-900 mt-1">
                    {formatDate(application.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated</span>
                  <p className="text-gray-900 mt-1">
                    {formatDate(application.updatedAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Franchise ID</span>
                  <p className="text-gray-900 mt-1">{application.id}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Address</span>
                  <p className="text-gray-900 mt-1">{application.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Franchisee Section */}
          <PendingFranchiseeSection
            franchisee={application.franchisee}
            applicationId={application.id.toString()}
            isExpanded={expandedRows.has(`${application.id}-franchisee`)}
            onToggle={onToggleRow}
          />
        </div>
      </div>
    </div>
  );
}
