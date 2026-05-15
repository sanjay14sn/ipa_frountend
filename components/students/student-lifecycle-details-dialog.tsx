"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { StudentLifecycleRow, StudentLifecycleStatus } from "@/services/student.service";

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

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

export function StudentLifecycleDetailContent({ row }: { row: StudentLifecycleRow }) {
  return (
    <ExpandedDetailSurface className="rounded-lg">
      <ExpandedDetailSection title="Deadlines">
        <DetailFieldsGrid columns={4}>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lifecycle details</DialogTitle>
          <DialogDescription>
            {row?.name || "Student"} · {row?.rollNo || "No roll number"}
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
