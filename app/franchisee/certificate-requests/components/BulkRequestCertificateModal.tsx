"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

type GroupFormState = {
  courseInstructorId: string; // string for Select component
  marksMap: Record<number, string>; // studentId -> marks string
  applyToAll: string; // helper input for "apply to all"
};

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
}

function GroupCardSection({
  group,
  formState,
  onCiChange,
  onMarksChange,
  onApplyToAll,
  onApplyToAllChange,
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

      {/* Apply to all in group */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Apply Marks to All in Group
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
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

      {/* Per-student marks */}
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-green">
        {group.students.map((student) => (
          <div
            key={student.id}
            className="flex items-center gap-3 p-2 bg-muted/30 rounded"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{student.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {student.rollNo} · {student.levelName}
              </div>
            </div>
            <Input
              type="number"
              min="0"
              value={formState.marksMap[student.id] ?? ""}
              onChange={(e) => onMarksChange(group.key, student.id, e.target.value)}
              placeholder="Marks"
              className="w-24 shrink-0"
            />
          </div>
        ))}
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
}: BulkRequestCertificateModalProps) {
  const [forms, setForms] = useState<Record<string, GroupFormState>>(() =>
    Object.fromEntries(
      groups.map((g) => [
        g.key,
        { courseInstructorId: "", marksMap: {}, applyToAll: "" },
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

  const canSubmit = groups.every((g) => {
    const state = forms[g.key];
    if (!state?.courseInstructorId) return false;
    return g.students.every((s) => {
      const v = state.marksMap[s.id];
      return (
        v !== undefined &&
        v !== "" &&
        !isNaN(parseInt(v)) &&
        parseInt(v) >= 0
      );
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
        if (isNaN(marks) || marks < 0) {
          toast.error(`Invalid marks for ${s.name}`);
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
          })),
        })),
      };
      await bulkCert.mutateAsync(payload);
      const totalStudents = groups.reduce((n, g) => n + g.students.length, 0);
      toast.success(
        `Certificate requests created for ${totalStudents} student(s) across ${groups.length} group(s)`
      );
      // reset
      setForms(
        Object.fromEntries(
          groups.map((g) => [
            g.key,
            { courseInstructorId: "", marksMap: {}, applyToAll: "" },
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Bulk Certificate Request"
      description={`Request certificates for ${totalStudents} student(s) across ${groups.length} group(s)`}
      headerIcon={Users}
      onSubmit={handleSubmit}
      isSubmitting={bulkCert.isPending}
      canSubmit={canSubmit}
      submitLabel={`Submit All (${totalStudents} students)`}
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
              }
            }
            onCiChange={handleCiChange}
            onMarksChange={handleMarksChange}
            onApplyToAll={handleApplyToAll}
            onApplyToAllChange={handleApplyToAllChange}
          />
        ))}
      </div>
    </FormDialog>
  );
}
