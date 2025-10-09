"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Award } from "lucide-react";
import { RequestedCertificateDetail } from "@/services/student.service";
import CertificateDetailCard from "./CertificateDetailCard";

interface CertificateDetailsProps {
  students: RequestedCertificateDetail[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onIssueCertificate?: (student: RequestedCertificateDetail) => void;
  isIssued?: boolean;
}

// Create ref for the last student dot to calculate line height
export const certificateDotRef = React.createRef<HTMLDivElement>();

export default function CertificateDetails({
  students,
  lastRow,
  expandedRows,
  onToggleRow,
  onIssueCertificate,
  isIssued = false,
}: CertificateDetailsProps) {
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const updateLineHeight = () => {
      if (certificateDotRef.current) {
        const rect = certificateDotRef.current.getBoundingClientRect();
        setLineHeight(rect.height);
      }
    };

    updateLineHeight();
    window.addEventListener("resize", updateLineHeight);
    return () => window.removeEventListener("resize", updateLineHeight);
  }, [students]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  return (
    <div
      className={`bg-gray-50 border-t border-gray-200 ${
        lastRow ? "rounded-b-lg" : ""
      }`}
    >
      <div className="p-6">
        <div className="space-y-4">
          {students.map((student, index) => {
            const studentId = `${student.franchiseName}-${
              student.id || student.rollNo
            }`;
            const isExpanded = expandedRows.has(studentId);
            const isLastStudent = index === students.length - 1;

            return (
              <div key={student.id || student.rollNo} className="relative">
                {/* Connection Line */}
                {!isLastStudent && (
                  <div
                    className="absolute left-6 top-12 w-px bg-gray-300"
                    style={{ height: `${lineHeight}px` }}
                  />
                )}

                <div className="flex items-start gap-4">
                  {/* Student Dot */}
                  <div
                    ref={isLastStudent ? certificateDotRef : null}
                    className="flex-shrink-0 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm mt-1"
                  />

                  {/* Student Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleRow(studentId)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.rollNo} •{" "}
                            {student.dateOfBirth
                              ? `Age ${calculateAge(student.dateOfBirth)}`
                              : "Age N/A"}
                          </div>
                          <div className="text-xs text-primary font-medium">
                            Certificate Request
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {student.marksObtained}/{student.totalMarks}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(
                              (student.marksObtained / student.totalMarks) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {student.courseInstructorName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {student.courseInstructorId}
                          </div>
                        </div>
                        <Badge
                          className={`${getStatusColor(
                            student.certificateIssueDate
                              ? "Approved"
                              : "Pending"
                          )} border`}
                        >
                          {student.certificateIssueDate ? "Issued" : "Pending"}
                        </Badge>
                        {!isIssued && onIssueCertificate && (
                          <Button
                            size="sm"
                            onClick={() => onIssueCertificate(student)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Award className="w-4 h-4 mr-1" />
                            Issue Certificate
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <CertificateDetailCard
                        student={student}
                        lastRow={isLastStudent}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
