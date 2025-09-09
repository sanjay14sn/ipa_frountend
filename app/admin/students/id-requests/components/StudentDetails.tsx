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
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react";
import { RequestedIdDetail } from "@/services/student.service";
import StudentDetailCard from "./StudentDetailCard";

interface StudentDetailsProps {
  students: RequestedIdDetail[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onIssueId?: (student: RequestedIdDetail) => void;
  isIssued?: boolean;
}

// Create ref for the last student dot to calculate line height
export const studentDotRef = React.createRef<HTMLDivElement>();

export default function StudentDetails({
  students,
  lastRow,
  expandedRows,
  onToggleRow,
  onIssueId,
  isIssued = false,
}: StudentDetailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const calculateLineHeight = () => {
      if (containerRef.current && studentDotRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const dotCenter =
          studentDotRef.current.getBoundingClientRect().top +
          studentDotRef.current.offsetHeight / 2;
        setLineHeight(dotCenter - containerTop);
      }
    };

    // Add a small delay to ensure DOM has updated after expansion/collapse
    const timeoutId = setTimeout(calculateLineHeight, 10);

    return () => clearTimeout(timeoutId);
  }, [students, expandedRows]);

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
          {/* Students Table */}
          <div className="relative">
            {/* Curved horizontal connecting line with dot */}
            <div ref={studentDotRef} className="absolute -left-6 top-4 w-6 h-4">
              <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
              <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
            </div>

            <div className="bg-white rounded-lg border border-primary overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Student</TableHead>
                    <TableHead className="text-center">Date of Birth</TableHead>
                    <TableHead className="text-center">
                      {isIssued ? "Issue Date" : "Status"}
                    </TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => {
                    const studentId = `${student.rollNo}-${student.name}`;
                    return (
                      <React.Fragment key={studentId}>
                        <TableRow className="hover:bg-gray-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onToggleRow(studentId)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedRows.has(studentId) ? (
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
                                  Roll No: {student.rollNo}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {student.dateOfBirth
                              ? new Date(
                                  student.dateOfBirth
                                ).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.idIssueDate ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                {new Date(
                                  student.idIssueDate
                                ).toLocaleDateString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isIssued && onIssueId ? (
                              <Button
                                size="sm"
                                onClick={() => onIssueId(student)}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Issue ID
                              </Button>
                            ) : (
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                Issued
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Student Details */}
                        {expandedRows.has(studentId) && (
                          <TableRow>
                            <TableCell colSpan={4} className="p-0">
                              <StudentDetailCard
                                student={student}
                                lastRow={index === students.length - 1}
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
