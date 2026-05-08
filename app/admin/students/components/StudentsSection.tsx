"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RawTableSurface } from "@/components/shared";
import { RequestedIdDetail } from "@/services/student.service";

interface StudentsSectionProps {
  students: RequestedIdDetail[];
  franchiseName: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onIssueId?: (student: RequestedIdDetail) => void;
  statusFilter: string;
  expandedRows: Set<string>;
}

export default function StudentsSection({
  students,
  franchiseName: _franchiseName,
  isExpanded: _isExpanded,
  onToggle: _onToggle,
  onIssueId,
  statusFilter,
  expandedRows: _expandedRows,
}: StudentsSectionProps) {
  return (
    <RawTableSurface className="shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary hover:bg-secondary">
            <TableHead>Student Name</TableHead>
            <TableHead className="text-center">Roll Number</TableHead>
            <TableHead className="text-center">Date of Birth</TableHead>
            <TableHead>Residential Address</TableHead>
            <TableHead>Father Contact</TableHead>
            <TableHead>Mother Contact</TableHead>
            <TableHead>Franchise Address</TableHead>
            {statusFilter === "Requested" ? (
              <TableHead className="text-center">Actions</TableHead>
            ) : (
              <TableHead className="text-center">Issue Date</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.rollNo} className="hover:bg-gray-50">
              <TableCell>
                <div className="font-medium text-gray-900">{student.name}</div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{student.rollNo}</Badge>
              </TableCell>
              <TableCell className="text-center text-sm text-gray-600">
                {student.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString()
                  : "N/A"}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {student.residentialAddress || "N/A"}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {student.fatherContactNo || "N/A"}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {student.motherContactNo || "N/A"}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {student.franchise?.address ||
                  student.franchiseeAddress ||
                  "N/A"}
              </TableCell>
              {statusFilter === "Requested" ? (
                <TableCell className="text-center">
                  {onIssueId && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onIssueId(student)}
                    >
                      Issue ID
                    </Button>
                  )}
                </TableCell>
              ) : (
                <TableCell className="text-center text-sm text-gray-600">
                  {student.idIssueDate
                    ? new Date(student.idIssueDate).toLocaleDateString()
                    : "N/A"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RawTableSurface>
  );
}
