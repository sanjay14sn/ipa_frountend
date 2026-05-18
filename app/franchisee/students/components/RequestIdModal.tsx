"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CreditCard, Users, CheckCircle } from "lucide-react";
import { StudentData, StudentIdStatus } from "@/services/student.service";
import { requestStudentIdsWithRevalidation } from "@/hooks/api/student.hooks";

interface RequestIdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentData[];
  onSuccess: () => void;
}

export default function RequestIdModal({
  open,
  onOpenChange,
  students,
  onSuccess,
}: RequestIdModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Filter students who are eligible for ID requests (not issued)
  const eligibleStudents = students.filter(
    (student) => student.idIssued === StudentIdStatus.NOT_ISSUED
  );

  const handleStudentToggle = (studentId: number) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === eligibleStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(eligibleStudents.map((s) => s.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.size === 0) return;

    setIsLoading(true);
    try {
      const studentIds = Array.from(selectedStudents);
      await requestStudentIdsWithRevalidation(studentIds);
      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error requesting IDs:", error);
      toast.error("Failed to request IDs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStudents(new Set());
    setSubmitted(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={false} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              ID Requests Submitted!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your ID card requests have been submitted successfully. You will
              be notified once the IDs are ready.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center border-b border-gray-200 pb-4 flex-shrink-0">
          <div className="flex justify-center mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Request Student ID Cards
          </DialogTitle>
          <DialogDescription>
            Select students to request ID cards. Only students without issued
            IDs are eligible.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Summary Section */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">
                    {eligibleStudents.length} students eligible for ID requests
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary"
                >
                  {selectedStudents.size} selected
                </Badge>
              </div>
              <p className="text-sm text-primary mt-2">
                Students with "Not Issued" ID status can request new ID cards
              </p>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={
                    selectedStudents.size === eligibleStudents.length &&
                    eligibleStudents.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="selectAll" className="text-sm font-medium">
                  Select All Eligible Students
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(new Set())}
                disabled={selectedStudents.size === 0}
              >
                Clear Selection
              </Button>
            </div>

            {/* Students List */}
            <div className="border rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-1">Select</div>
                  <div className="col-span-3">Student</div>
                  <div className="col-span-2">Roll No</div>
                  <div className="col-span-2">Standard</div>
                  <div className="col-span-2">Level</div>
                  <div className="col-span-2">ID Status</div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {eligibleStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      No students eligible for ID requests
                    </p>
                    <p className="text-sm">
                      All students already have ID cards issued or requested
                    </p>
                  </div>
                ) : (
                  eligibleStudents.map((student) => (
                    <div
                      key={student.id}
                      className="px-4 py-3 border-b hover:bg-gray-50 transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <Checkbox
                            checked={selectedStudents.has(student.id)}
                            onCheckedChange={() =>
                              handleStudentToggle(student.id)
                            }
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.sex}
                          </div>
                        </div>
                        <div className="col-span-2 text-sm text-gray-700">
                          {student.rollNo}
                        </div>
                        <div className="col-span-2 text-sm text-gray-700">
                          {student.standard}
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline" className="text-xs">
                            {typeof student.level === 'object' && student.level !== null && 'name' in student.level 
                              ? student.level.name 
                              : typeof student.level === 'string' 
                              ? student.level 
                              : 'N/A'}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/20"
                          >
                            {student.idIssued}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Warning for students with other statuses */}
            {students.filter((s) => s.idIssued !== StudentIdStatus.NOT_ISSUED)
              .length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-primary mb-1">
                      Some students are not eligible
                    </h4>
                    <p className="text-sm text-primary">
                      Students with "Issued" or "Requested" ID status cannot
                      request new ID cards. Only students with "Not Issued"
                      status are eligible.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 p-4 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={selectedStudents.size === 0 || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>
                  Request {selectedStudents.size} ID
                  {selectedStudents.size !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
