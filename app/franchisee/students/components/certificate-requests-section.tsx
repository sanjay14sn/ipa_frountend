"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableLoadingState,
  TablePageShell,
} from "@/components/shared";
import { useEligibleStudents, useFranchiseeCertificates } from "@/hooks/api/student.hooks";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import { EligibleStudent } from "@/services/student.service";
import RequestCertificateModal from "@/app/franchisee/certificate-requests/components/RequestCertificateModal";
import BulkRequestCertificateModal, {
  GroupForModal,
} from "@/app/franchisee/certificate-requests/components/BulkRequestCertificateModal";
import EligibleStudentsTable from "@/app/franchisee/certificate-requests/components/EligibleStudentsTable";
import FranchiseeCertificatesTable from "@/app/franchisee/certificate-requests/components/FranchiseeCertificatesTable";

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
  const { courseInstructors } = useCourseInstructors();

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

  /** Convert a flat list of selected students into grouped GroupForModal[]. */
  const handleBulkRequest = (students: EligibleStudent[]) => {
    const map = new Map<string, GroupForModal>();
    for (const s of students) {
      const key = `${s.stream}__${s.levelName}__${s.levelId}__${s.programId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          stream: s.stream,
          levelName: s.levelName,
          levelId: s.levelId,
          programId: s.programId,
          students: [],
        });
      }
      map.get(key)!.students.push(s);
    }
    setGroupsForBulk([...map.values()]);
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
            <EligibleStudentsTable
              students={eligibleStudents}
              onRequestCertificate={handleRequestCertificate}
              onBulkRequest={handleBulkRequest}
              courseInstructors={courseInstructors}
            />
          )}

          {selectedStudent ? (
            <RequestCertificateModal
              open={isRequestModalOpen}
              onOpenChange={setIsRequestModalOpen}
              student={selectedStudent}
              courseInstructors={courseInstructors}
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
            <FranchiseeCertificatesTable
              certificates={certificates}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>
      </Tabs>
    </TablePageShell>
  );
}
