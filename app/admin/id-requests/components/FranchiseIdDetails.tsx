"use client";

import { RequestedIdDetail } from "@/services/student.service";
import StudentsSection from "./StudentsSection";
import { useRef } from "react";
import { TreeConnector } from "@/components/shared";

interface FranchiseIdDetailsProps {
  franchiseName: string;
  students: RequestedIdDetail[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onIssueId?: (student: RequestedIdDetail) => void;
  statusFilter: string;
}

export default function FranchiseIdDetails({
  franchiseName,
  students,
  lastRow,
  expandedRows,
  onToggleRow,
  onIssueId,
  statusFilter,
}: FranchiseIdDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const studentsDotRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        <TreeConnector
          type="vertical"
          targetRef={studentsDotRef}
          containerRef={containerRef}
        />

        <div className="pl-12 pr-6 py-6" ref={containerRef}>
          {/* Horizontal connector for the students table */}
          <div className="relative" ref={studentsDotRef}>
            <TreeConnector type="horizontal" />
          </div>

          {/* Students Section - Directly show students without franchise details */}
          <StudentsSection
            students={students}
            franchiseName={franchiseName}
            isExpanded={true}
            onToggle={onToggleRow}
            onIssueId={onIssueId}
            statusFilter={statusFilter}
            expandedRows={expandedRows}
          />
        </div>
      </div>
    </div>
  );
}
