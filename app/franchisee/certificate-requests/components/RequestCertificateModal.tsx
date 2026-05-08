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
import { useToast } from "@/hooks/use-toast";
import {
  CourseInstructorData,
  getEligibleCourseInstructorsForCertificate,
} from "@/services/course-instructor.service";
import { useRequestCertificateForStudent } from "@/hooks/api/student.hooks";

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
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const marksObtained = parseInt(formData.marksObtained, 10);

    if (marksObtained < 0) {
      toast({
        title: "Error",
        description:
          "Invalid marks: marks obtained must be non-negative",
        variant: "destructive",
      });
      return;
    }

    if (!student.programId || !student.levelId) {
      toast({
        title: "Error",
        description: "Student program or level is missing. Refresh and try again.",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Certificate request created successfully",
      });

      setFormData({
        marksObtained: "",
        courseInstructorId: "",
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating certificate request:", error);
      toast({
        title: "Error",
        description: "Failed to create certificate request. Please try again.",
        variant: "destructive",
      });
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
              value={formData.marksObtained === "0" ? "" : formData.marksObtained}
              onChange={(e) =>
                handleInputChange("marksObtained", e.target.value)
              }
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
