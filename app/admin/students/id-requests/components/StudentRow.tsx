"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react";
import { RequestedIdDetail } from "@/services/student.service";

interface StudentRowProps {
  student: RequestedIdDetail;
  isExpanded: boolean;
  onToggle: (studentId: string) => void;
  onIssueId?: (student: RequestedIdDetail) => void;
  isIssued?: boolean;
}

export default function StudentRow({
  student,
  isExpanded,
  onToggle,
  onIssueId,
  isIssued = false,
}: StudentRowProps) {
  const studentId = `${student.rollNo}-${student.name}`;

  return (
    <TableRow className="hover:bg-gray-50/50">
      <TableCell>
        <div className="flex items-center gap-2 pl-6">
          <button
            onClick={() => onToggle(studentId)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="flex flex-col">
            <div className="font-medium text-gray-900">{student.name}</div>
            <div className="text-sm text-gray-500">
              Roll No: {student.rollNo}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString()
          : "N/A"}
      </TableCell>
      <TableCell className="text-center">
        {student.idIssueDate ? (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            {new Date(student.idIssueDate).toLocaleDateString()}
          </Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        )}
      </TableCell>
      <TableCell className="text-center">
        {!isIssued && onIssueId ? (
          <Button size="sm" onClick={() => onIssueId(student)}>
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
  );
}
