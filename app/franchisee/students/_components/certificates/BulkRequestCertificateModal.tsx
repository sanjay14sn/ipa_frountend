"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { EligibleStudent, BulkCertificateRequestDto } from "@/services/student.service";
import { toast } from "sonner";
import { useBulkRequestCertificates } from "@/hooks/api/student.hooks";
import { useEligibleCourseInstructorsForCertificate } from "@/hooks/api/certificate.hooks";
import { FormDialog } from "@/components/shared/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupForModal {
  key: string;
  stream: string;
  levelName: string;
  levelId: number;
  programId: number;
  students: EligibleStudent[];
}

export interface BulkRequestCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupForModal[];
  onSuccess: () => void;
  /** When false, hides "Apply to All" helpers — use for single-student requests */
  showBulkHelpers?: boolean;
}

type GroupFormState = {
  courseInstructorId: string; // string for Select component
  marksMap: Record<number, string>; // studentId -> marks string
  applyToAll: string; // helper input for "apply to all"
  completionMap: Record<number, string>; // studentId -> completion date (YYYY-MM-DD)
  applyDateToAll: string; // helper for "apply date to all"
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert ISO YYYY-MM-DD to display DD/MM/YYYY */
function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Return an inline error string for a student's completion date, or null if valid/empty */
function getDateError(
  cd: string | undefined,
  minDate: string | undefined,
  todayIso: string,
): string | null {
  if (!cd) return null;
  if (cd > todayIso) return "Cannot be in the future";
  if (minDate && cd < minDate) return `Must be on or after ${toDisplayDate(minDate)}`;
  return null;
}

// ---------------------------------------------------------------------------
// GroupCardSection sub-component
// ---------------------------------------------------------------------------

interface GroupCardSectionProps {
  group: GroupForModal;
  formState: GroupFormState;
  onCiChange: (groupKey: string, ciId: string) => void;
  onMarksChange: (groupKey: string, studentId: number, value: string) => void;
  onApplyToAll: (groupKey: string) => void;
  onApplyToAllChange: (groupKey: string, value: string) => void;
  completionMap: Record<number, string>;
  applyDateToAll: string;
  onDateChange: (groupKey: string, studentId: number, value: string) => void;
  onApplyDateToAll: (groupKey: string) => void;
  onApplyDateToAllChange: (groupKey: string, value: string) => void;
  todayIso: string;
  showBulkHelpers: boolean;
}

function GroupCardSection({
  group,
  formState,
  onCiChange,
  onMarksChange,
  onApplyToAll,
  onApplyToAllChange,
  completionMap,
  applyDateToAll,
  onDateChange,
  onApplyDateToAll,
  onApplyDateToAllChange,
  todayIso,
  showBulkHelpers,
}: GroupCardSectionProps) {
  const { data: eligibleInstructors = [], isLoading } =
    useEligibleCourseInstructorsForCertificate([group.levelId], group.programId);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Header: "Stream · Level (N students)" */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">
          {group.stream} · {group.levelName}
        </span>
        <Badge variant="secondary">
          {group.students.length} student{group.students.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* CI dropdown */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Course Instructor <span className="text-destructive">*</span>
        </label>
        <Select
          value={formState.courseInstructorId}
          onValueChange={(v) => onCiChange(group.key, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select course instructor" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                Loading instructors...
              </SelectItem>
            ) : eligibleInstructors.length === 0 ? (
              <SelectItem value="none" disabled>
                No instructor eligible for this level — contact admin
              </SelectItem>
            ) : (
              eligibleInstructors.map((ci) => (
                <SelectItem key={ci.id} value={ci.id.toString()}>
                  {ci.name} ({ci.instructorId})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Apply to all in group — hidden in single-student mode */}
      {showBulkHelpers && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Apply Marks to All in Group
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={formState.applyToAll}
              onChange={(e) => onApplyToAllChange(group.key, e.target.value)}
              placeholder="Enter marks"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onApplyToAll(group.key)}
              disabled={!formState.applyToAll}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Apply date to all in group — hidden in single-student mode */}
      {showBulkHelpers && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Apply Completion Date to All in Group
          </label>
          <div className="flex gap-2">
            <DateInput
              min={group.students
                .map((s) => s.minCompletionDate)
                .filter(Boolean)
                .sort()
                .pop() || undefined}
              max={todayIso}
              value={applyDateToAll}
              onChange={(v) => onApplyDateToAllChange(group.key, v)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onApplyDateToAll(group.key)}
              disabled={!applyDateToAll}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Per-student marks */}
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-green">
        {group.students.map((student) => {
          const dateError = getDateError(
            completionMap[student.id],
            student.minCompletionDate || undefined,
            todayIso,
          );
          return (
            <div
              key={student.id}
              className="flex items-start gap-3 p-2 bg-muted/30 rounded"
            >
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-sm font-medium truncate">{student.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {student.rollNo} · {student.levelName}
                </div>
              </div>
              <div className="w-36 shrink-0 space-y-1">
                <DateInput
                  min={student.minCompletionDate || undefined}
                  max={todayIso}
                  value={completionMap[student.id] ?? ""}
                  onChange={(v) => onDateChange(group.key, student.id, v)}
                />
                {dateError && (
                  <p className="text-xs text-destructive leading-tight">{dateError}</p>
                )}
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                value={formState.marksMap[student.id] ?? ""}
                onChange={(e) => onMarksChange(group.key, student.id, e.target.value)}
                placeholder="Marks"
                className="w-24 shrink-0 mt-0.5"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal component
// ---------------------------------------------------------------------------

export default function BulkRequestCertificateModal({
  open,
  onOpenChange,
  groups,
  onSuccess,
  showBulkHelpers = true,
}: BulkRequestCertificateModalProps) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isSingle = !showBulkHelpers;

  const [forms, setForms] = useState<Record<string, GroupFormState>>(() =>
    Object.fromEntries(
      groups.map((g) => [
        g.key,
        { courseInstructorId: "", marksMap: {}, applyToAll: "", completionMap: {}, applyDateToAll: "" },
      ])
    )
  );
  const bulkCert = useBulkRequestCertificates();

  const handleCiChange = (groupKey: string, ciId: string) => {
    setForms((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], courseInstructorId: ciId },
    }));
  };

  const handleMarksChange = (
    groupKey: string,
    studentId: number,
    value: string
  ) => {
    setForms((prev) => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        marksMap: { ...prev[groupKey].marksMap, [studentId]: value },
      },
    }));
  };

  const handleApplyToAll = (groupKey: string) => {
    const state = forms[groupKey];
    if (!state?.applyToAll) return;
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    const newMap: Record<number, string> = {};
    group.students.forEach((s) => {
      newMap[s.id] = state.applyToAll;
    });
    setForms((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], marksMap: newMap },
    }));
  };

  const handleApplyToAllChange = (groupKey: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], applyToAll: value },
    }));
  };

  const handleDateChange = (groupKey: string, studentId: number, value: string) => {
    setForms((prev) => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        completionMap: { ...prev[groupKey].completionMap, [studentId]: value },
      },
    }));
  };

  const handleApplyDateToAll = (groupKey: string) => {
    const state = forms[groupKey];
    if (!state?.applyDateToAll) return;
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    const newMap: Record<number, string> = {};
    group.students.forEach((s) => {
      newMap[s.id] = state.applyDateToAll;
    });
    setForms((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], completionMap: newMap },
    }));
  };

  const handleApplyDateToAllChange = (groupKey: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], applyDateToAll: value },
    }));
  };

  const canSubmit = groups.every((g) => {
    const state = forms[g.key];
    if (!state?.courseInstructorId) return false;
    return g.students.every((s) => {
      const v = state.marksMap[s.id];
      const validMarks =
        v !== undefined &&
        v !== "" &&
        !isNaN(parseInt(v)) &&
        parseInt(v) >= 0 &&
        parseInt(v) <= 100;
      const cd = state.completionMap[s.id];
      const minDate = s.minCompletionDate;
      const validDate =
        cd !== undefined &&
        cd !== "" &&
        cd <= todayIso &&
        (!minDate || cd >= minDate);
      return validMarks && validDate;
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    for (const g of groups) {
      const state = forms[g.key];
      if (!state?.courseInstructorId) {
        toast.error(
          `Please select a course instructor for ${g.stream} · ${g.levelName}`
        );
        return;
      }
      for (const s of g.students) {
        const v = state.marksMap[s.id];
        if (!v && v !== "0") {
          toast.error(
            `Please enter marks for ${s.name} (${g.stream} · ${g.levelName})`
          );
          return;
        }
        const marks = parseInt(v);
        if (isNaN(marks) || marks < 0 || marks > 100) {
          toast.error(`Invalid marks for ${s.name} — must be between 0 and 100`);
          return;
        }
      }
      for (const s of g.students) {
        const cd = state.completionMap[s.id];
        if (!cd) {
          toast.error(`Please enter completion date for ${s.name} (${g.stream} · ${g.levelName})`);
          return;
        }
        const minDate = s.minCompletionDate;
        if (minDate && cd < minDate) {
          toast.error(`Completion date for ${s.name} must be on or after ${minDate}`);
          return;
        }
        if (cd > todayIso) {
          toast.error(`Completion date for ${s.name} cannot be in the future`);
          return;
        }
      }
    }

    try {
      const payload: BulkCertificateRequestDto = {
        groups: groups.map((g) => ({
          programId: g.programId,
          levelId: g.levelId,
          courseInstructorId: parseInt(forms[g.key].courseInstructorId, 10),
          students: g.students.map((s) => ({
            studentId: s.id,
            marksObtained: parseInt(forms[g.key].marksMap[s.id], 10),
            completionDate: forms[g.key].completionMap[s.id],
          })),
        })),
      };
      const result = await bulkCert.mutateAsync(payload);
      const succeededCount = result.succeeded.length;
      const failedCount = result.failed.length;

      // The API carries a per-student reason; marks are only one of them (a
      // level with no certificate template configured is another). Show the
      // distinct reasons rather than assuming.
      const failureReasons = Array.from(
        new Set(result.failed.map((f) => f.error).filter(Boolean))
      );
      const reasonSuffix = failureReasons.length
        ? ` (${failureReasons.join("; ")})`
        : "";

      if (succeededCount > 0 && failedCount > 0) {
        toast.success(
          `Certificate requests created for ${succeededCount} student(s). ${failedCount} student(s) were not eligible.`
        );
        toast.error(
          `${failedCount} student(s) could not be requested${reasonSuffix}.`
        );
      } else if (succeededCount > 0) {
        toast.success(
          `Certificate requests created for ${succeededCount} student(s) across ${groups.length} group(s)`
        );
      } else {
        toast.error(
          `No certificate requests were created${reasonSuffix || ". All selected students are not eligible"}.`
        );
        return;
      }
      // reset
      setForms(
        Object.fromEntries(
          groups.map((g) => [
            g.key,
            { courseInstructorId: "", marksMap: {}, applyToAll: "", completionMap: {}, applyDateToAll: "" },
          ])
        )
      );
      onSuccess();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(
        typeof msg === "string" && msg
          ? msg
          : "Failed to create certificate requests. Please try again."
      );
    }
  };

  const totalStudents = groups.reduce((n, g) => n + g.students.length, 0);
  const singleStudent = isSingle ? groups[0]?.students[0] : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={isSingle ? "Request Certificate" : "Bulk Certificate Request"}
      description={
        isSingle && singleStudent
          ? `Create a certificate request for ${singleStudent.name} (Roll No: ${singleStudent.rollNo})`
          : `Request certificates for ${totalStudents} student(s) across ${groups.length} group(s)`
      }
      headerIcon={Users}
      onSubmit={handleSubmit}
      isSubmitting={bulkCert.isPending}
      canSubmit={canSubmit}
      submitLabel={isSingle ? "Create Request" : `Submit All (${totalStudents} students)`}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-green pr-1">
        {groups.map((group) => (
          <GroupCardSection
            key={group.key}
            group={group}
            formState={
              forms[group.key] ?? {
                courseInstructorId: "",
                marksMap: {},
                applyToAll: "",
                completionMap: {},
                applyDateToAll: "",
              }
            }
            onCiChange={handleCiChange}
            onMarksChange={handleMarksChange}
            onApplyToAll={handleApplyToAll}
            onApplyToAllChange={handleApplyToAllChange}
            completionMap={forms[group.key]?.completionMap ?? {}}
            applyDateToAll={forms[group.key]?.applyDateToAll ?? ""}
            onDateChange={handleDateChange}
            onApplyDateToAll={handleApplyDateToAll}
            onApplyDateToAllChange={handleApplyDateToAllChange}
            todayIso={todayIso}
            showBulkHelpers={showBulkHelpers}
          />
        ))}
      </div>
    </FormDialog>
  );
}
