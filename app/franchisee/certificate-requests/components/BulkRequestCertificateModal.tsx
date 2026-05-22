"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Users } from "lucide-react";
import { EligibleStudent } from "@/services/student.service";
import { toast } from "sonner";
import {
  CourseInstructorData,
  getEligibleCourseInstructorsForCertificate,
} from "@/services/course-instructor.service";
import { useBulkRequestCertificates } from "@/hooks/api/student.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  DialogFormField,
  DialogStateMessage,
  FormDialog,
} from "@/components/shared/dialog";

interface BulkRequestCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: EligibleStudent[];
  courseInstructors: CourseInstructorData[];
  onSuccess: () => void;
}

export default function BulkRequestCertificateModal({
  open,
  onOpenChange,
  students,
  onSuccess,
}: BulkRequestCertificateModalProps) {
  const [courseInstructorId, setCourseInstructorId] = useState<string>("");
  const [marksMap, setMarksMap] = useState<Record<number, string>>({});
  const [applyToAllMarks, setApplyToAllMarks] = useState<string>("");
  const [eligibleInstructors, setEligibleInstructors] = useState<CourseInstructorData[]>([]);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
  const bulkCert = useBulkRequestCertificates();
  const requestedLevelIds = useMemo(
    () => [...new Set(students.map((student) => student.levelId).filter((id) => id > 0))],
    [students],
  );
  const programId = useMemo(
    () => students[0]?.programId ?? undefined,
    [students],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadEligible() {
      if (!open || requestedLevelIds.length === 0) return;
      setIsLoadingInstructors(true);
      try {
        const rows = await getEligibleCourseInstructorsForCertificate(
          requestedLevelIds,
          programId,
        );
        if (!cancelled) setEligibleInstructors(rows);
      } catch (error) {
        if (!cancelled) {
          setEligibleInstructors([]);
          console.error("Error loading eligible course instructors:", error);
        }
      } finally {
        if (!cancelled) setIsLoadingInstructors(false);
      }
    }
    void loadEligible();
    return () => {
      cancelled = true;
    };
  }, [open, requestedLevelIds]);

  const handleApplyToAll = () => {
    if (!applyToAllMarks) return;
    const marks = parseInt(applyToAllMarks);
    if (isNaN(marks) || marks < 0) {
      toast.error("Please enter a valid marks value");
      return;
    }
    const newMarksMap: Record<number, string> = {};
    students.forEach((student) => {
      newMarksMap[student.id] = applyToAllMarks;
    });
    setMarksMap(newMarksMap);
  };

  const handleMarksChange = (studentId: number, value: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseInstructorId) {
      toast.error("Please select a course instructor");
      return;
    }

    const missingMarks: string[] = [];
    const invalidMarks: string[] = [];

    students.forEach((student) => {
      const marksStr = marksMap[student.id];
      if (!marksStr) {
        missingMarks.push(student.name);
      } else {
        const marks = parseInt(marksStr);
        if (isNaN(marks) || marks < 0) {
          invalidMarks.push(student.name);
        }
      }
    });

    if (missingMarks.length > 0) {
      toast.error(`Please enter marks for: ${missingMarks.join(", ")}`);
      return;
    }

    if (invalidMarks.length > 0) {
      toast.error(`Invalid marks for: ${invalidMarks.join(", ")}`);
      return;
    }

    try {
      const requestData = {
        courseInstructorId: parseInt(courseInstructorId, 10),
        students: students.map((student) => ({
          studentId: student.id,
          marksObtained: parseInt(marksMap[student.id], 10),
        })),
      };

      await bulkCert.mutateAsync(requestData);

      toast.success(`Certificate requests created successfully for ${students.length} student(s)`);

      setCourseInstructorId("");
      setMarksMap({});
      setApplyToAllMarks("");

      onSuccess();
    } catch (error: unknown) {
      console.error("Error creating bulk certificate requests:", error);
      let description = "Failed to create certificate requests. Please try again.";
      if (
        error &&
        typeof error === "object" &&
        "response" in error
      ) {
        const msg = (error as { response?: { data?: { message?: string } } })
          .response?.data?.message;
        if (typeof msg === "string" && msg) description = msg;
      }
      toast.error(description);
    }
  };

  const isLoading = bulkCert.isPending;

  const selectedInstructorDetails = eligibleInstructors.find(
    (ci) => ci.id.toString() === courseInstructorId
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Bulk Certificate Request"
      description={`Create certificate requests for ${students.length} selected student(s)`}
      headerIcon={Users}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      canSubmit={
        !isLoadingInstructors &&
        Boolean(courseInstructorId) &&
        eligibleInstructors.length > 0
      }
      submitLabel={`Create ${students.length} Request${students.length !== 1 ? "s" : ""}`}
    >
      <DialogFormField id="courseInstructor" label="Course Instructor" required>
        <Select value={courseInstructorId} onValueChange={setCourseInstructorId}>
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
                No instructor is eligible for all selected levels
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

      <DialogFormField id="applyToAllMarks" label="Apply Marks to All Students">
        <div className="flex gap-2">
          <Input
            id="applyToAllMarks"
            type="number"
            min="0"
            value={applyToAllMarks}
            onChange={(e) => setApplyToAllMarks(e.target.value)}
            onFocus={selectInputValueOnFocus}
            placeholder="Enter marks (e.g., 85)"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleApplyToAll}
            disabled={!applyToAllMarks}
            className="rounded-lg"
          >
            Apply to All
          </Button>
        </div>
      </DialogFormField>

      <DialogFormField label="Marks for Each Student" required>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-green border border-border rounded-lg p-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-card-foreground truncate">
                  {student.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {student.rollNo} • {student.levelName}
                </div>
              </div>
              <div className="w-32 shrink-0">
                <Input
                  type="number"
                  min="0"
                  value={marksMap[student.id] ?? ""}
                  onChange={(e) =>
                    handleMarksChange(student.id, e.target.value)
                  }
                  onFocus={selectInputValueOnFocus}
                  placeholder="Marks"
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </DialogFormField>

      {selectedInstructorDetails && (
        <DialogStateMessage
          tone="success"
          title="Selected Instructor"
          description={`${selectedInstructorDetails.name} (${selectedInstructorDetails.instructorId})`}
        />
      )}
    </FormDialog>
  );
}
