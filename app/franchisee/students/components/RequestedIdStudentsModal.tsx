"use client";

import { Badge } from "@/components/ui/badge";
import {
  AppDialog,
  AppDialogHeader,
  AppDialogBody,
  AppDialogFooter,
} from "@/components/shared/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Calendar, User, Phone, Mail } from "lucide-react";
import { StudentData, StudentIdStatus } from "@/services/student.service";
import { calculateAge } from "@/lib/date-utils";

interface RequestedIdStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentData[];
}

export default function RequestedIdStudentsModal({
  open,
  onOpenChange,
  students,
}: RequestedIdStudentsModalProps) {
  // Filter students who have requested ID cards
  const requestedIdStudents = students.filter(
    (student) => student.idIssued === StudentIdStatus.REQUESTED
  );



  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="2xl" scrollBody>
      <AppDialogHeader
        icon={CreditCard}
        title="Students with Requested ID Cards"
        description={`${requestedIdStudents.length} student${requestedIdStudents.length !== 1 ? "s" : ""} have requested ID cards`}
      />
      <AppDialogBody>
        {requestedIdStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No ID card requests</p>
              <p className="text-sm">No students have requested ID cards yet</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary hover:bg-secondary">
                      <TableHead className="w-[200px]">Student</TableHead>
                      <TableHead className="text-center">Roll No</TableHead>
                      <TableHead className="text-center">
                        Standard & Level
                      </TableHead>
                      <TableHead className="text-center">Contact</TableHead>
                      <TableHead className="text-center">
                        Date Requested
                      </TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestedIdStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Age {calculateAge(student.dateOfBirth)} •{" "}
                                {student.sex}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {student.rollNo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {student.standard}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {typeof student.level === 'object' && student.level !== null && 'name' in student.level 
                                ? student.level.name 
                                : typeof student.level === 'string' 
                                ? student.level 
                                : 'N/A'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center justify-center">
                              <Mail className="w-3 h-3 mr-1" />
                              <span className="truncate max-w-[120px]">
                                {student.mail}
                              </span>
                            </div>
                            <div className="flex items-center justify-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {student.fatherContactNo}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {student.idIssued}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
      </AppDialogBody>
      <AppDialogFooter
        sticky
        leftSlot={
          <span>
            Total: {requestedIdStudents.length} requested ID
            {requestedIdStudents.length !== 1 ? "s" : ""}
          </span>
        }
        primary={{
          label: "Close",
          onClick: () => onOpenChange(false),
        }}
      />
    </AppDialog>
  );
}
