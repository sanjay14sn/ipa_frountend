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
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import {
  AdminCourseInstructorData,
  getInstructorTrainingLevelCount,
} from "@/services/course-instructor.service";
import CourseInstructorDetailCard from "./CourseInstructorDetailCard";

interface CourseInstructorDetailsProps {
  instructors: AdminCourseInstructorData[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove?: (instructor: AdminCourseInstructorData) => void;
  onReject?: (instructor: AdminCourseInstructorData) => void;
  showActions?: boolean;
}

// Create ref for the last instructor dot to calculate line height
export const instructorDotRef = React.createRef<HTMLDivElement>();

export default function CourseInstructorDetails({
  instructors,
  lastRow,
  expandedRows,
  onToggleRow,
  onApprove,
  onReject,
  showActions = false,
}: CourseInstructorDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && instructorDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          instructorDotRef.current.getBoundingClientRect().top +
          instructorDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [instructors, expandedRows]);

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
    <div
      className={`bg-gray-50 border-t border-black/20 ${
        lastRow ? "rounded-b-lg" : "border-b border-black/20"
      }`}
    >
      <div className="relative">
        {/* Vertical connecting line from main row */}
        <div
          className="absolute left-6 border-primary border bg-primary"
          style={{ top: 0, height: `${lineHeight - 6}px` }}
        ></div>

        <div className="pl-12 pr-6 py-6 space-y-6" ref={containerRef}>
          {/* Instructors Table */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div
              ref={instructorDotRef}
              className="absolute -left-6 top-4 w-6 h-4"
            >
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>

            <div className="bg-white rounded-lg border border-primary overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      Course Instructor
                    </TableHead>
                    <TableHead className="text-center">Contact</TableHead>
                    <TableHead className="text-center">Location</TableHead>
                    <TableHead className="text-center">Professional</TableHead>
                    <TableHead className="text-center">Personal Info</TableHead>
                    <TableHead className="text-center">Training Levels</TableHead>
                    <TableHead className="text-center">Date of Birth</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.map((instructor, index) => {
                    const instructorId = `${instructor.instructorId}-${instructor.name}`;
                    return (
                      <React.Fragment key={instructorId}>
                        <TableRow className="hover:bg-gray-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onToggleRow(instructorId)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedRows.has(instructorId) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex flex-col">
                                <div className="font-medium text-gray-900">
                                  {instructor.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {instructor.instructorId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col text-sm">
                              <span className="text-gray-900">{instructor.phone || "N/A"}</span>
                              <span className="text-gray-500 text-xs">{instructor.mail || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col text-sm">
                              <span className="text-gray-900">{instructor.city || "N/A"}</span>
                              {instructor.address && (
                                <span className="text-gray-500 text-xs truncate max-w-[150px]" title={instructor.address}>
                                  {instructor.address.length > 25 
                                    ? instructor.address.substring(0, 25) + "..." 
                                    : instructor.address}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col text-sm">
                              <span className="text-gray-900">{instructor.education || "N/A"}</span>
                              <span className="text-gray-500 text-xs">{instructor.occupation || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col text-sm">
                              <span className="text-gray-900">
                                {instructor.dob
                                  ? `${Math.floor((new Date().getTime() - new Date(instructor.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`
                                  : "N/A"}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {instructor.bloodGroup || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getInstructorTrainingLevelCount(instructor) > 0 ? (
                              <span className="text-sm font-medium text-gray-700">
                                {getInstructorTrainingLevelCount(instructor)} level(s)
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">No levels</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {instructor.dob
                              ? new Date(instructor.dob).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={getStatusColor(instructor.status)}
                            >
                              {instructor.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {showActions &&
                                instructor.status === "Pending" && (
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

                        {/* Expanded Instructor Details */}
                        {expandedRows.has(instructorId) && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <CourseInstructorDetailCard
                                instructor={instructor}
                                expandedRows={expandedRows}
                                onToggleRow={onToggleRow}
                                lastRow={index === instructors.length - 1}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
