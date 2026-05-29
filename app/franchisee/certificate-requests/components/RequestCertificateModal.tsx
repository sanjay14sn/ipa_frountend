"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award } from "lucide-react";
import { EligibleStudent } from "@/services/student.service";
import { toast } from "sonner";
import { CourseInstructorData } from "@/services/course-instructor.service";
import { useRequestCertificateForStudent } from "@/hooks/api/student.hooks";
import { useEligibleCourseInstructorsForCertificate } from "@/hooks/api/certificate.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  DialogFormField,
  DialogStateMessage,
  FormDialog,
} from "@/components/shared/dialog";
import { sendClientLog } from "@/lib/client-telemetry";

interface RequestCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: EligibleStudent;
  courseInstructors?: CourseInstructorData[];
  onSuccess: () => void;
}

export default function RequestCertificateModal({
  open,
  onOpenChange,
  student,
  onSuccess,
}: RequestCertificateModalProps) {
  const [formData, setFormData] = useState({
    marksObtained: "",
    courseInstructorId: "",
    completionDate: "",
  });
  const requestCert = useRequestCertificateForStudent();

  const todayIso = new Date().toISOString().slice(0, 10);

  const levelIds = student.levelId > 0 ? [student.levelId] : [];
  const {
    data: eligibleInstructors = [],
    isLoading: isLoadingInstructors,
  } = useEligibleCourseInstructorsForCertificate(
    levelIds,
    student.programId ?? undefined,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.marksObtained || !formData.courseInstructorId || !formData.completionDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const minDate = student.minCompletionDate; // "YYYY-MM-DD" or ""
    if (minDate && formData.completionDate < minDate) {
      toast.error(`Completion date must be on or after ${minDate}`);
      return;
    }
    if (formData.completionDate > todayIso) {
      toast.error("Completion date cannot be in the future");
      return;
    }

    const marksObtained = parseInt(formData.marksObtained, 10);

    if (marksObtained < 0) {
      toast.error("Invalid marks: marks obtained must be non-negative");
      return;
    }

    if (!student.programId || !student.levelId) {
      toast.error("Student program or level is missing. Refresh and try again.");
      return;
    }

    try {
      await requestCert.mutateAsync({
        studentId: student.id,
        programId: student.programId,
        levelId: student.levelId,
        marksObtained,
        courseInstructorId: parseInt(formData.courseInstructorId, 10),
        completionDate: formData.completionDate,
      });

      toast.success("Certificate request created successfully");

      setFormData({
        marksObtained: "",
        courseInstructorId: "",
        completionDate: "",
      });

      onSuccess();
    } catch (error) {
      sendClientLog({ level: "error", event: "certificate-request-error", message: "Error creating certificate request", context: { error } });
      toast.error("Failed to create certificate request. Please try again.");
    }
  };

  const isLoading = requestCert.isPending;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectedInstructor = eligibleInstructors.find(
    (ci) => ci.id.toString() === formData.courseInstructorId
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Request Certificate"
      description={`Create a certificate request for ${student.name} (Roll No: ${student.rollNo})`}
      headerIcon={Award}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      canSubmit={!isLoadingInstructors && eligibleInstructors.length > 0}
      submitLabel="Create Request"
      cancelLabel="Cancel"
    >
      <DialogFormField
        id="courseInstructor"
        label="Course Instructor"
        required
      >
        <Select
          value={formData.courseInstructorId}
          onValueChange={(value) =>
            handleInputChange("courseInstructorId", value)
          }
        >
          <SelectTrigger id="courseInstructor">
            <SelectValue placeholder="Select course instructor" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingInstructors ? (
              <SelectItem value="loading" disabled>
                Loading eligible instructors...
              </SelectItem>
            ) : eligibleInstructors.length === 0 ? (
              <SelectItem value="none" disabled>
                No eligible instructors found for this level
              </SelectItem>
            ) : (
              eligibleInstructors.map((instructor) => (
                <SelectItem
                  key={instructor.id}
                  value={instructor.id.toString()}
                >
                  {instructor.name} ({instructor.instructorId})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </DialogFormField>

      <DialogFormField
        id="completionDate"
        label="Completion Date"
        required
      >
        <Input
          id="completionDate"
          type="date"
          min={student.minCompletionDate || undefined}
          max={todayIso}
          value={formData.completionDate}
          onChange={(e) => handleInputChange("completionDate", e.target.value)}
          required
        />
      </DialogFormField>

      <DialogFormField
        id="marksObtained"
        label="Marks Obtained"
        required
      >
        <Input
          id="marksObtained"
          type="number"
          min="0"
          value={formData.marksObtained}
          onChange={(e) => handleInputChange("marksObtained", e.target.value)}
          onFocus={selectInputValueOnFocus}
          placeholder="e.g., 85"
          required
        />
      </DialogFormField>

      {selectedInstructor && (
        <DialogStateMessage
          tone="success"
          title="Selected Instructor"
          description={`${selectedInstructor.name} (${selectedInstructor.instructorId})`}
        />
      )}
    </FormDialog>
  );
}
