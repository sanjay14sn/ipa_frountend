"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableErrorState,
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { useEligibleStudents, useFranchiseeCertificates } from "@/hooks/api/student.hooks";
import { EligibleStudent } from "@/services/student.service";
import BulkRequestCertificateModal, {
  GroupForModal,
} from "./certificates/BulkRequestCertificateModal";
import EligibleStudentsGroupedView from "./certificates/EligibleStudentsGroupedView";
import FranchiseeCertificatesGroupedView from "./certificates/FranchiseeCertificatesGroupedView";

export function FranchiseeCertificateRequestsSection() {
  const [groupsForModal, setGroupsForModal] = useState<GroupForModal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(false);

  const {
    eligibleStudents,
    isLoading: isLoadingEligible,
    // Both hooks expose `error`; dropping it rendered a failed fetch as "no
    // eligible students", which reads as a business answer rather than an
    // outage (R7).
    error: eligibleError,
    revalidate: revalidateEligible,
  } = useEligibleStudents();
  const {
    certificates,
    isLoading: isLoadingCertificates,
    error: certificatesError,
    revalidate,
  } = useFranchiseeCertificates();
  const handleRequestCertificate = (student: EligibleStudent) => {
    setGroupsForModal([{
      key: `${student.programId}-${student.levelId}`,
      stream: student.stream,
      levelName: student.levelName,
      levelId: student.levelId,
      programId: student.programId,
      students: [student],
    }]);
    setIsSingleMode(true);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setGroupsForModal([]);
    revalidate();
  };

  const handleBulkRequest = (groups: GroupForModal[]) => {
    setGroupsForModal(groups);
    setIsSingleMode(false);
    setIsModalOpen(true);
  };

  return (
    <TablePageShell
      title="Certificate Management"
      description="Request and view certificates for your students"
    >
      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">Request Certificate</TabsTrigger>
          <TabsTrigger value="history">Certificate History</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          {isLoadingEligible ? (
            <TableLoadingState message="Loading eligible students..." />
          ) : eligibleError ? (
            <TableErrorState
              message="Couldn't load eligible students"
              onRetry={revalidateEligible}
            />
          ) : (
            <EligibleStudentsGroupedView
              students={eligibleStudents}
              onRequestCertificate={handleRequestCertificate}
              onBulkRequest={handleBulkRequest}
            />
          )}

          {groupsForModal.length > 0 ? (
            <BulkRequestCertificateModal
              open={isModalOpen}
              onOpenChange={setIsModalOpen}
              groups={groupsForModal}
              onSuccess={handleSuccess}
              showBulkHelpers={!isSingleMode}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoadingCertificates ? (
            <TableLoadingState message="Loading certificate history..." />
          ) : certificatesError ? (
            <TableErrorState
              message="Couldn't load certificate history"
              onRetry={revalidate}
            />
          ) : (
            <FranchiseeCertificatesGroupedView
              certificates={certificates}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}
