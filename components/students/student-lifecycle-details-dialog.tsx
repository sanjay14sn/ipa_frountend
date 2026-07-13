"use client";

import { DetailDialog } from "@/components/shared/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { StudentLifecycleRow, StudentLifecycleStatus } from "@/services/student.service";
import { formatEntityCodeForDisplay } from "@/lib/format-entity-code";
import { formatDate } from "@/lib/date-utils";

const statusLabels: Record<StudentLifecycleStatus, string> = {
  ACTIVE: "Active",
  AT_RISK: "At risk",
  EXTENDED: "Extended",
  INVALIDATED: "Invalidated",
  REACTIVATED: "Reactivated",
};

const reasonLabels: Record<string, string> = {
  CERTIFICATE_NOT_ISSUED_AFTER_LEVEL_DURATION_GRACE:
    "Certificate was not issued within the level duration and grace period.",
};

function formatReason(value?: string | null) {
  if (!value) return "—";
  return (
    reasonLabels[value] ??
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

function formatStatus(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function lifecycleAnchorDate(row: StudentLifecycleRow): string | null {
  return row.previousLevelCompletedAt ?? row.dateOfJoining;
}

function formatElapsedDuration(
  start?: string | null,
  end?: string | null,
): string {
  if (!start) return "—";
  const startDate = parseDateOnly(start);
  const endDate = end ? parseDateOnly(end) : new Date();
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "—";
  }
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (totalDays < 0) return "—";
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  if (months > 0 && days > 0) {
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"}`;
  }
  if (months > 0) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

function formatAllowedDuration(durationInMonths: number | null): string {
  if (durationInMonths == null) return "—";
  const graceMonths = 1;
  const total = durationInMonths + graceMonths;
  return `${total} months (${durationInMonths} + ${graceMonths} grace)`;
}

function StudentLifecycleDetailContent({ row }: { row: StudentLifecycleRow }) {
  const anchorDate = lifecycleAnchorDate(row);
  const elapsedEnd = row.lifecycleInvalidatedAt ?? null;

  return (
    <ExpandedDetailSurface className="rounded-lg">
      <ExpandedDetailSection title="Deadlines">
        <DetailFieldsGrid columns={4}>
          <DetailField
            label="Previous level completed"
            value={
              row.previousLevelCompletedAt
                ? formatDate(row.previousLevelCompletedAt)
                : "— (first level — uses joined date)"
            }
          />
          <DetailField
            label="Lifecycle anchor"
            value={formatDate(anchorDate)}
          />
          <DetailField
            label="Elapsed since anchor"
            value={formatElapsedDuration(anchorDate, elapsedEnd)}
          />
          <DetailField
            label="Allowed duration"
            value={formatAllowedDuration(row.durationInMonths)}
          />
          <DetailField
            label="Base duration"
            value={row.durationInMonths ? `${row.durationInMonths} months` : "—"}
          />
          <DetailField label="Deadline" value={formatDate(row.lifecycleDeadline)} />
          <DetailField label="Extended until" value={formatDate(row.lifecycleExtendedUntil)} />
          <DetailField label="Invalidated at" value={formatDate(row.lifecycleInvalidatedAt)} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Status">
        <DetailFieldsGrid columns={2}>
          <DetailField label="Progression status" value={formatStatus(row.progressionStatus)} />
          <DetailField
            label="Lifecycle status"
            value={statusLabels[row.lifecycleStatus] ?? row.lifecycleStatus}
          />
          <DetailField label="Reason" value={formatReason(row.lifecycleInvalidationReason)} span={2} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}

export function StudentLifecycleDetailsDialog({
  open,
  onOpenChange,
  row,
  isLoading = false,
  loadError = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StudentLifecycleRow | null;
  isLoading?: boolean;
  loadError?: boolean;
}) {
  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title="Lifecycle details"
      description={
        <span title={row?.rollNo ?? undefined}>
          {row?.name || "Student"} ·{" "}
          {row?.rollNo
            ? formatEntityCodeForDisplay(row.rollNo)
            : "No roll number"}
        </span>
      }
    >
      {isLoading ? (
        <div className="space-y-3 py-1">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-muted-foreground">
          Could not load lifecycle details for this student.
        </p>
      ) : row ? (
        <StudentLifecycleDetailContent row={row} />
      ) : null}
    </DetailDialog>
  );
}
