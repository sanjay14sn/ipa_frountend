"use client";

import { useState } from "react";
import { RequestedIdDetail } from "@/services/student.service";
import IdCardPreviewModal from "@/app/admin/id-requests/components/IdCardPreviewModal";
import RequestedIdTable from "@/app/admin/id-requests/components/RequestedIdTable";

interface IdRequestsSectionProps {
  franchiseId?: string;
  /** Omit hub-style page title (e.g. franchise detail embed). */
  embed?: boolean;
}

export function IdRequestsSection({
  franchiseId,
  embed,
}: IdRequestsSectionProps = {}) {
  const [selectedStudent, setSelectedStudent] =
    useState<RequestedIdDetail | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleIssueId = (student: RequestedIdDetail) => {
    setSelectedStudent(student);
    setIsPreviewModalOpen(true);
  };

  const handleIssueSuccess = () => {
    setIsPreviewModalOpen(false);
    triggerRefresh();
  };

  return (
    <div className="space-y-6">
      <RequestedIdTable
        onIssueId={handleIssueId}
        refreshTrigger={refreshTrigger}
        scopedFranchiseId={franchiseId}
      />

      {/* ID Card Preview Modal */}
      {selectedStudent && (
        <IdCardPreviewModal
          open={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          student={selectedStudent}
          onSuccess={handleIssueSuccess}
        />
      )}
    </div>
  );
}
