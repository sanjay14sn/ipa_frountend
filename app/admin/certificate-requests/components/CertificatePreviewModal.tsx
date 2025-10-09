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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, Loader2 } from "lucide-react";
import { RequestedCertificateDetail } from "@/services/student.service";
import { issueCertificate } from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";

interface CertificatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: RequestedCertificateDetail;
  onSuccess: () => void;
}

export default function CertificatePreviewModal({
  open,
  onOpenChange,
  student,
  onSuccess,
}: CertificatePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const percentage = (student.marksObtained / student.totalMarks) * 100;

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 40) return "C";
    return "F";
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-800 border-green-200";
      case "B+":
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "C+":
      case "C":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const handleIssueCertificate = async () => {
    if (!student.id) {
      toast({
        title: "Error",
        description: "Student ID is required to issue certificate",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await issueCertificate(student.id);
      toast({
        title: "Success",
        description: "Certificate issued successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error issuing certificate:", error);
      toast({
        title: "Error",
        description: "Failed to issue certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Issue Certificate
          </DialogTitle>
          <DialogDescription>
            Review the student details and issue the certificate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Student Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{student.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Roll No:</span>
                    <span className="font-medium">{student.rollNo}</span>
                  </div>
                  {student.dateOfBirth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date of Birth:</span>
                      <span className="font-medium">
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Academic Performance
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marks Obtained:</span>
                    <span className="font-medium">{student.marksObtained}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Marks:</span>
                    <span className="font-medium">{student.totalMarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Percentage:</span>
                    <span className="font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grade:</span>
                    <Badge className={getGradeColor(getGrade(percentage))}>
                      {getGrade(percentage)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Course Instructor Information */}
          {student.courseInstructorName && (
            <>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Course Instructor
                </h4>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instructor:</span>
                    <span className="font-medium">
                      {student.courseInstructorName}
                    </span>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Franchise Information */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Franchise Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Franchise:</span>
                <span className="font-medium">{student.franchiseName}</span>
              </div>
              {student.franchiseeAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-right max-w-xs">
                    {student.franchiseeAddress}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          {(student.fatherContactNo || student.motherContactNo) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Contact Information
                </h4>
                <div className="space-y-2 text-sm">
                  {student.fatherContactNo && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Father's Contact:</span>
                      <span className="font-medium">
                        {student.fatherContactNo}
                      </span>
                    </div>
                  )}
                  {student.motherContactNo && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mother's Contact:</span>
                      <span className="font-medium">
                        {student.motherContactNo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleIssueCertificate}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Issuing...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Issue Certificate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
