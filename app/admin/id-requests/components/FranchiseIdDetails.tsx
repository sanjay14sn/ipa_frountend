"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { RequestedIdDetail } from "@/services/student.service";
import StudentsSection from "@/app/admin/students/components/StudentsSection";

interface FranchiseIdDetailsProps {
  franchiseId: string;
  franchiseName: string;
  students: RequestedIdDetail[];
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
  onIssueId?: (student: RequestedIdDetail) => void;
  statusFilter: string;
}

export default function FranchiseIdDetails({
  franchiseId: _franchiseId,
  franchiseName,
  students,
  lastRow,
  expandedRows,
  onToggleRow,
  onIssueId,
  statusFilter,
}: FranchiseIdDetailsProps) {
  return (
    <ExpandedDetailSurface
      className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
    >
      <ExpandedDetailSection title="ID request summary">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Franchise" value={franchiseName} />
          <DetailField label="Students" value={students.length} />
          <DetailField label="Status" value={statusFilter} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection
        title={statusFilter === "Requested" ? "Students awaiting issue" : "Issued IDs"}
      >
        <StudentsSection
          students={students}
          franchiseName={franchiseName}
          isExpanded
          onToggle={onToggleRow}
          onIssueId={onIssueId}
          statusFilter={statusFilter}
          expandedRows={expandedRows}
        />
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
