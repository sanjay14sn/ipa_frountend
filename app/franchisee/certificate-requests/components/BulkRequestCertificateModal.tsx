"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Loader2, Users } from "lucide-react";
import { EligibleStudent } from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";
import {
  CourseInstructorData,
  getEligibleCourseInstructorsForCertificate,
} from "@/services/course-instructor.service";
import { useBulkRequestCertificates } from "@/hooks/api/student.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";

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
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: "Please enter a valid marks value",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Please select a course instructor",
        variant: "destructive",
      });
      return;
    }

    // Validate all students have marks
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
      toast({
        title: "Error",
        description: `Please enter marks for: ${missingMarks.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (invalidMarks.length > 0) {
      toast({
        title: "Error",
        description: `Invalid marks for: ${invalidMarks.join(", ")}`,
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: `Certificate requests created successfully for ${students.length} student(s)`,
      });

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
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const isLoading = bulkCert.isPending;

  const selectedInstructorDetails = eligibleInstructors.find(
    (ci) => ci.id.toString() === courseInstructorId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Certificate Request
          </DialogTitle>
          <DialogDescription>
            Create certificate requests for {students.length} selected student(s)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Instructor Selection */}
          <div className="space-y-2">
            <Label htmlFor="courseInstructor">Course Instructor *</Label>
            <Select
              value={courseInstructorId}
              onValueChange={setCourseInstructorId}
            >
              <SelectTrigger>
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
                ) : eligibleInstructors.map((instructor) => (
                  <SelectItem
                    key={instructor.id}
                    value={instructor.id.toString()}
                  >
                    {instructor.name} ({instructor.instructorId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply to All Marks */}
          <div className="space-y-2 border-b pb-4">
            <Label htmlFor="applyToAllMarks">Apply Marks to All Students</Label>
            <div className="flex gap-2">
              <Input
                id="applyToAllMarks"
                type="number"
                min="0"
                value={applyToAllMarks}
                onChange={(e) => {
                  const val = e.target.value;
                  setApplyToAllMarks(val);
                }}
                onFocus={selectInputValueOnFocus}
                placeholder="Enter marks (e.g., 85)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyToAll}
                disabled={!applyToAllMarks}
              >
                Apply to All
              </Button>
            </div>
          </div>

          {/* Individual Student Marks */}
          <div className="space-y-4">
            <Label>Marks for Each Student *</Label>
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {student.rollNo} • {student.levelName}
                    </div>
                  </div>
                  <div className="w-32">
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
          </div>

          {/* Selected Instructor Info */}
          {selectedInstructorDetails && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-blue-900">
                  Selected Instructor:
                </div>
                <div className="text-blue-700">
                  {selectedInstructorDetails.name} ({selectedInstructorDetails.instructorId})
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isLoadingInstructors}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                isLoadingInstructors ||
                !courseInstructorId ||
                eligibleInstructors.length === 0
              }
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  Create {students.length} Request{students.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

