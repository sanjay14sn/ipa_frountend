"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { useEligibleStudents, useFranchiseeCertificates } from "@/hooks/api/student.hooks";
import { EligibleStudent } from "@/services/student.service";
import RequestCertificateModal from "@/app/franchisee/certificate-requests/components/RequestCertificateModal";
import BulkRequestCertificateModal, {
  GroupForModal,
} from "@/app/franchisee/certificate-requests/components/BulkRequestCertificateModal";
import EligibleStudentsGroupedView from "@/app/franchisee/certificate-requests/components/EligibleStudentsGroupedView";
import FranchiseeCertificatesGroupedView from "@/app/franchisee/certificate-requests/components/FranchiseeCertificatesGroupedView";

export function FranchiseeCertificateRequestsSection() {
  const [selectedStudent, setSelectedStudent] =
    useState<EligibleStudent | null>(null);
  const [groupsForBulk, setGroupsForBulk] = useState<GroupForModal[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isBulkRequestModalOpen, setIsBulkRequestModalOpen] = useState(false);

  const { eligibleStudents, isLoading: isLoadingEligible } =
    useEligibleStudents();
  const {
    certificates,
    isLoading: isLoadingCertificates,
    revalidate,
  } = useFranchiseeCertificates();
  const handleRequestCertificate = (student: EligibleStudent) => {
    setSelectedStudent(student);
    setIsRequestModalOpen(true);
  };

  const handleSuccess = () => {
    setIsRequestModalOpen(false);
    setIsBulkRequestModalOpen(false);
    setGroupsForBulk([]);
    revalidate();
  };

  const handleBulkRequest = (groups: GroupForModal[]) => {
    setGroupsForBulk(groups);
    setIsBulkRequestModalOpen(true);
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

          {selectedStudent ? (
            <RequestCertificateModal
              open={isRequestModalOpen}
              onOpenChange={setIsRequestModalOpen}
              student={selectedStudent}
              onSuccess={handleSuccess}
            />
          ) : null}

          {groupsForBulk.length > 0 ? (
            <BulkRequestCertificateModal
              open={isBulkRequestModalOpen}
              onOpenChange={setIsBulkRequestModalOpen}
              groups={groupsForBulk}
              onSuccess={handleSuccess}
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
