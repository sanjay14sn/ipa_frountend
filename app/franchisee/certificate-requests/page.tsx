"use client";

import { useState } from "react";
import { useEligibleStudents } from "@/hooks/use-students";
import { useCourseInstructors } from "@/hooks/use-course-instructors";
import RequestCertificateModal from "./components/RequestCertificateModal";
import EligibleStudentsTable from "./components/EligibleStudentsTable";
import { EligibleStudent } from "@/services/student.service";

export default function FranchiseeCertificateRequestsPage() {
  const [selectedStudent, setSelectedStudent] =
    useState<EligibleStudent | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const { eligibleStudents, isLoading } = useEligibleStudents();
  const { courseInstructors } = useCourseInstructors();

  const handleRequestCertificate = (student: EligibleStudent) => {
    console.log("Request certificate clicked for student:", student);
    setSelectedStudent(student);
    setIsRequestModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Certificate Requests
          </h1>
          <p className="text-muted-foreground">
            Request certificates for your eligible students
          </p>
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading eligible students...
        </div>
      ) : (
        <EligibleStudentsTable
          students={eligibleStudents}
          onRequestCertificate={handleRequestCertificate}
        />
      )}

      {/* Request Certificate Modal */}
      {selectedStudent && (
        <RequestCertificateModal
          open={isRequestModalOpen}
          onOpenChange={setIsRequestModalOpen}
          student={selectedStudent}
          courseInstructors={courseInstructors}
          onSuccess={() => setIsRequestModalOpen(false)}
        />
      )}
    </div>
  );
}
