"use client";

import React, { useState } from "react";
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
import { CourseInstructorData } from "@/services/course-instructor.service";

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
  courseInstructors,
  onSuccess,
}: RequestCertificateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    marksObtained: "",
    courseInstructorId: "",
  });
  const { toast } = useToast();

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

    const marksObtained = parseInt(formData.marksObtained);

    if (marksObtained < 0) {
      toast({
        title: "Error",
        description:
          "Invalid marks: marks obtained must be non-negative",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        marksObtained,
        courseInstructerId: parseInt(formData.courseInstructorId),
      };

      const response = await fetch(
        `http://localhost:5000/certificate/request/${student.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Failed to create certificate request");
      }

      const result = await response.json();

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectedInstructor = courseInstructors.find(
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
              {courseInstructors.map((instructor) => (
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
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
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
