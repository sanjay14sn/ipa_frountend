"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { useEligibleStudents, useFranchiseeCertificates } from "@/hooks/api/student.hooks";
import { EligibleStudent } from "@/services/student.service";
import BulkRequestCertificateModal, {
  GroupForModal,
} from "@/app/franchisee/certificate-requests/components/BulkRequestCertificateModal";
import EligibleStudentsGroupedView from "@/app/franchisee/certificate-requests/components/EligibleStudentsGroupedView";
import FranchiseeCertificatesGroupedView from "@/app/franchisee/certificate-requests/components/FranchiseeCertificatesGroupedView";

export function FranchiseeCertificateRequestsSection() {
  const [groupsForModal, setGroupsForModal] = useState<GroupForModal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(false);

  const { eligibleStudents, isLoading: isLoadingEligible } =
    useEligibleStudents();
  const {
    certificates,
    isLoading: isLoadingCertificates,
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
