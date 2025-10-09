"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";

interface CourseInstructorRowProps {
  instructor: AdminCourseInstructorData;
  isExpanded: boolean;
  onToggle: (instructorId: string) => void;
  onApprove?: (instructor: AdminCourseInstructorData) => void;
  onReject?: (instructor: AdminCourseInstructorData) => void;
  showActions?: boolean;
}

export default function CourseInstructorRow({
  instructor,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  showActions = false,
}: CourseInstructorRowProps) {
  const instructorId = `${instructor.instructorId}-${instructor.name}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <TableRow className="hover:bg-gray-50/50">
      <TableCell>
        <div className="flex items-center gap-2 pl-6">
          <button
            onClick={() => onToggle(instructorId)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{instructor.name}</div>
            <div className="text-sm text-gray-500">
              ID: {instructor.instructorId}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {instructor.dob ? new Date(instructor.dob).toLocaleDateString() : "N/A"}
      </TableCell>
      <TableCell className="text-center">
        <Badge className={getStatusColor(instructor.status)}>
          {instructor.status}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {showActions && instructor.status === "Pending" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove?.(instructor)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReject?.(instructor)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
