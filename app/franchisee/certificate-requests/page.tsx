"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEligibleStudents, useFranchiseeCertificates } from "@/hooks/use-students";
import { useCourseInstructors } from "@/hooks/use-course-instructors";
import RequestCertificateModal from "./components/RequestCertificateModal";
import BulkRequestCertificateModal from "./components/BulkRequestCertificateModal";
import EligibleStudentsTable from "./components/EligibleStudentsTable";
import FranchiseeCertificatesTable from "./components/FranchiseeCertificatesTable";
import { EligibleStudent } from "@/services/student.service";

export default function FranchiseeCertificateRequestsPage() {
  const [selectedStudent, setSelectedStudent] =
    useState<EligibleStudent | null>(null);
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState<EligibleStudent[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isBulkRequestModalOpen, setIsBulkRequestModalOpen] = useState(false);

  const { eligibleStudents, isLoading: isLoadingEligible } = useEligibleStudents();
  const { certificates, isLoading: isLoadingCertificates, revalidate } = useFranchiseeCertificates();
  const { courseInstructors } = useCourseInstructors();

  const handleRequestCertificate = (student: EligibleStudent) => {
    console.log("Request certificate clicked for student:", student);
    setSelectedStudent(student);
    setIsRequestModalOpen(true);
  };

  const handleSuccess = () => {
    setIsRequestModalOpen(false);
    setIsBulkRequestModalOpen(false);
    setSelectedStudentsForBulk([]);
    revalidate();
  };

  const handleBulkRequest = (students: EligibleStudent[]) => {
    setSelectedStudentsForBulk(students);
    setIsBulkRequestModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Certificate Management
          </h1>
          <p className="text-muted-foreground">
            Request and view certificates for your students
          </p>
        </div>
      </div>

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">Request Certificate</TabsTrigger>
          <TabsTrigger value="history">Certificate History</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          {isLoadingEligible ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading eligible students...
            </div>
          ) : (
            <EligibleStudentsTable
              students={eligibleStudents}
              onRequestCertificate={handleRequestCertificate}
              onBulkRequest={handleBulkRequest}
              courseInstructors={courseInstructors}
            />
          )}

          {/* Request Certificate Modal */}
          {selectedStudent && (
            <RequestCertificateModal
              open={isRequestModalOpen}
              onOpenChange={setIsRequestModalOpen}
              student={selectedStudent}
              courseInstructors={courseInstructors}
              onSuccess={handleSuccess}
            />
          )}

          {/* Bulk Request Certificate Modal */}
          {selectedStudentsForBulk.length > 0 && (
            <BulkRequestCertificateModal
              open={isBulkRequestModalOpen}
              onOpenChange={setIsBulkRequestModalOpen}
              students={selectedStudentsForBulk}
              courseInstructors={courseInstructors}
              onSuccess={handleSuccess}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoadingCertificates ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading certificate history...
            </div>
          ) : (
            <FranchiseeCertificatesTable
              certificates={certificates}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
