"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DetailField,
  DetailFieldsGrid,
  RawTableSurface,
} from "@/components/shared";
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

function showIssueButton(student: RequestedIdDetail, statusFilter: string) {
  if (statusFilter === "Requested") return true;
  if (statusFilter === "all") return student.idIssued === "Requested";
  return false;
}

function formatIssueDate(student: RequestedIdDetail) {
  if (student.idIssueDate) {
    return new Date(student.idIssueDate).toLocaleDateString();
  }
  return "—";
}

function StudentIdRequestDetailContent({
  student,
  statusFilter,
  onIssueId,
  onClose,
}: {
  student: RequestedIdDetail;
  statusFilter: string;
  onIssueId?: (student: RequestedIdDetail) => void;
  onClose: () => void;
}) {
  const canIssue = showIssueButton(student, statusFilter) && onIssueId;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-left">Student details</DialogTitle>
        <DialogDescription className="text-left">
          Full information for this ID request
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <DetailFieldsGrid columns={2}>
          <DetailField label="Student name" value={student.name || "N/A"} />
          <DetailField label="Roll number" value={student.rollNo || "N/A"} />
          <DetailField
            label="Date of birth"
            value={
              student.dateOfBirth
                ? new Date(student.dateOfBirth).toLocaleDateString()
                : "N/A"
            }
          />
          <DetailField
            label="ID status"
            value={student.idIssued?.trim() ? student.idIssued : "N/A"}
          />
          <DetailField
            label="Issue date"
            value={
              student.idIssueDate
                ? new Date(student.idIssueDate).toLocaleDateString()
                : "N/A"
            }
          />
          <DetailField
            label="Franchise"
            value={
              student.franchise?.name ||
              student.franchiseName ||
              "N/A"
            }
          />
          <DetailField
            span={2}
            label="Residential address"
            value={student.residentialAddress || "N/A"}
          />
          <DetailField
            label="Franchise address"
            value={
              student.franchise?.address ||
              student.franchiseeAddress ||
              "N/A"
            }
          />
          <DetailField
            label="Father contact"
            value={student.fatherContactNo || "N/A"}
          />
          <DetailField
            label="Mother contact"
            value={student.motherContactNo || "N/A"}
          />
        </DetailFieldsGrid>
        {canIssue ? (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onIssueId(student);
                onClose();
              }}
            >
              Issue ID
            </Button>
          </div>
        ) : (
          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </>
  );
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
  const [detailStudent, setDetailStudent] = useState<RequestedIdDetail | null>(
    null,
  );

  return (
    <>
      <RawTableSurface className="shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Roll number</TableHead>
              <TableHead className="text-center">DOB</TableHead>
              <TableHead className="text-center">Issue date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
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
                <TableCell className="text-center text-sm text-gray-600">
                  {formatIssueDate(student)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="View student details"
                      onClick={() => setDetailStudent(student)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </RawTableSurface>

      <Dialog
        open={detailStudent != null}
        onOpenChange={(open) => {
          if (!open) setDetailStudent(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {detailStudent ? (
            <StudentIdRequestDetailContent
              student={detailStudent}
              statusFilter={statusFilter}
              onIssueId={onIssueId}
              onClose={() => setDetailStudent(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
