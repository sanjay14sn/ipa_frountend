"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CreditCard, Users } from "lucide-react";
import { StudentData, StudentIdStatus } from "@/services/student.service";
import { requestStudentIdsWithRevalidation } from "@/hooks/api/student.hooks";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  DialogStateMessage,
  SuccessDialog,
} from "@/components/shared/dialog";
import { sendClientLog } from "@/lib/client-telemetry";

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

  const eligibleStudents = students.filter(
    (student) =>
      student.status === "active" &&
      student.idIssued === StudentIdStatus.NOT_ISSUED
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
      sendClientLog({ level: "error", event: "student-id-request-error", message: "Error requesting student IDs", context: { error } });
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
      <SuccessDialog
        open={open}
        onOpenChange={handleClose}
        title="ID Requests Submitted!"
        description="Your ID card requests have been submitted successfully. You will be notified once the IDs are ready."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  const ineligibleCount = students.length - eligibleStudents.length;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      padding="flush"
      scrollBody
    >
      <AppDialogHeader
        title="Request Student ID Cards"
        description="Select students to request ID cards. Only students without issued IDs are eligible."
        icon={CreditCard}
        sticky
      />

      <AppDialogBody className="space-y-5">
        <DialogStateMessage
          tone="success"
          icon={Users}
          title={`${eligibleStudents.length} students eligible for ID requests`}
          description='Students with "Not Issued" ID status can request new ID cards.'
          action={
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20"
            >
              {selectedStudents.size} selected
            </Badge>
          }
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer">
            <Checkbox
              id="selectAll"
              checked={
                selectedStudents.size === eligibleStudents.length &&
                eligibleStudents.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            Select All Eligible Students
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedStudents(new Set())}
            disabled={selectedStudents.size === 0}
            className="rounded-lg"
          >
            Clear Selection
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <div className="col-span-1">Select</div>
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Roll No</div>
              <div className="col-span-2">Standard</div>
              <div className="col-span-2">Level</div>
              <div className="col-span-2">ID Status</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-green divide-y divide-border">
            {eligibleStudents.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-card-foreground">
                  No students eligible for ID requests
                </p>
                <p className="text-xs">
                  All students already have ID cards issued or requested
                </p>
              </div>
            ) : (
              eligibleStudents.map((student) => (
                <label
                  key={student.id}
                  className="block px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="text-sm font-medium text-card-foreground">
                        {student.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {student.sex}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-card-foreground">
                      {student.rollNo}
                    </div>
                    <div className="col-span-2 text-sm text-card-foreground">
                      {student.standard}
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-xs">
                        {typeof student.level === "object" &&
                        student.level !== null &&
                        "name" in student.level
                          ? student.level.name
                          : typeof student.level === "string"
                          ? student.level
                          : "N/A"}
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
                </label>
              ))
            )}
          </div>
        </div>

        {ineligibleCount > 0 && (
          <DialogStateMessage
            tone="warning"
            icon={AlertCircle}
            title="Some students are not eligible"
            description='Students with "Issued" or "Requested" ID status cannot request new ID cards. Only students with "Not Issued" status are eligible.'
          />
        )}
      </AppDialogBody>

      <AppDialogFooter
        sticky
        padded
        secondary={{
          label: "Cancel",
          onClick: handleClose,
          disabled: isLoading,
        }}
        primary={{
          label:
            selectedStudents.size === 0
              ? "Request IDs"
              : `Request ${selectedStudents.size} ID${
                  selectedStudents.size !== 1 ? "s" : ""
                }`,
          onClick: handleSubmit,
          loading: isLoading,
          disabled: selectedStudents.size === 0,
          icon: CreditCard,
        }}
      />
    </AppDialog>
  );
}
