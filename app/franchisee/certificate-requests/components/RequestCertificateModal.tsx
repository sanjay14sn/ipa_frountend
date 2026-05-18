"use client";

import React, { useEffect, useState } from "react";
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
import { Award, Loader2 } from "lucide-react";
import { EligibleStudent } from "@/services/student.service";
import { toast } from "sonner";
import {
  CourseInstructorData,
  getEligibleCourseInstructorsForCertificate,
} from "@/services/course-instructor.service";
import { useRequestCertificateForStudent } from "@/hooks/api/student.hooks";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";

interface RequestCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: EligibleStudent;
  courseInstructors: CourseInstructorData[];
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
  });
  const [eligibleInstructors, setEligibleInstructors] = useState<CourseInstructorData[]>([]);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
  const requestCert = useRequestCertificateForStudent();

  useEffect(() => {
    let cancelled = false;
    async function loadEligible() {
      if (!open || !student.levelId) return;
      setIsLoadingInstructors(true);
      try {
        const rows = await getEligibleCourseInstructorsForCertificate(
          [student.levelId],
          student.programId ?? undefined,
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
  }, [open, student.levelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.marksObtained ||
      !formData.courseInstructorId
    ) {
      toast.error("Please fill in all required fields");
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
      });

      toast.success("Certificate request created successfully");

      setFormData({
        marksObtained: "",
        courseInstructorId: "",
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating certificate request:", error);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Request Certificate
          </DialogTitle>
          <DialogDescription>
            Create a certificate request for {student.name} (Roll No:{" "}
            {student.rollNo})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Instructor Selection */}
          <div className="space-y-2">
            <Label htmlFor="courseInstructor">Course Instructor *</Label>
            <Select
              value={formData.courseInstructorId}
              onValueChange={(value) =>
                handleInputChange("courseInstructorId", value)
              }
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
                  No eligible instructors found for this level
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

          {/* Marks Input */}
          <div className="space-y-2">
            <Label htmlFor="marksObtained">Marks Obtained *</Label>
            <Input
              id="marksObtained"
              type="number"
              min="0"
              value={formData.marksObtained}
              onChange={(e) =>
                handleInputChange("marksObtained", e.target.value)
              }
              onFocus={selectInputValueOnFocus}
              placeholder="e.g., 85"
              required
            />
          </div>

          {/* Selected Instructor Info */}
          {selectedInstructor && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-blue-900">
                  Selected Instructor:
                </div>
                <div className="text-blue-700">
                  {selectedInstructor.name} ({selectedInstructor.instructorId})
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
              disabled={isLoading || isLoadingInstructors || eligibleInstructors.length === 0}
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
                  Create Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
