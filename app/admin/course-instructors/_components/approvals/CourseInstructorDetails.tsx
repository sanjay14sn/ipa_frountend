"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slash } from "lucide-react";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
} from "@/components/shared";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import { formatDate as fmtDate } from "@/lib/date-utils";
import { formatRupees } from "@/lib/currency-utils";
import { getErrorMessage } from "@/lib/error-utils";
import {
  listInstructorReceivables,
  waiveCIReceivable,
} from "@/services/ci-training-admin.service";
import type { CITrainingReceivable } from "@/services/ci-training.service";
import { WaiveReceivableDialog } from "@/components/receivables/WaiveReceivableDialog";
import type { ReceivableSummaryItem } from "@/services/agreement.service";

interface CourseInstructorDetailsProps {
  instructors: AdminCourseInstructorData[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove?: (instructor: AdminCourseInstructorData) => void;
  onReject?: (instructor: AdminCourseInstructorData) => void;
  showActions?: boolean;
}

function statusBadge(status: CITrainingReceivable["status"]) {
  if (status === "paid") {
    return <StatusBadge label="Paid" />;
  }
  if (status === "waived") {
    return <Badge variant="secondary">Waived</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

function toReceivableSummaryItem(r: CITrainingReceivable): ReceivableSummaryItem {
  return {
    receivableItemId: r.id,
    label: r.label,
    kind: "installment",
    sequenceNumber: r.receivableOrder,
    amount: r.fee,
    payableAmount: r.fee,
    status: r.status === "paid" ? "paid" : r.status === "waived" ? "waived" : "scheduled",
    dueAt: null,
    paidAt: r.paidAt ?? null,
    paymentId: null,
    isInitialPayable: false,
    sortOrder: r.receivableOrder,
    waivedAt: r.waivedAt ?? null,
  };
}

interface InstructorReceivablesSectionProps {
  instructorId: number;
}

function InstructorReceivablesSection({ instructorId }: InstructorReceivablesSectionProps) {
  const queryClient = useQueryClient();
  const [waiveTarget, setWaiveTarget] = useState<CITrainingReceivable | null>(null);
  const [waiveOpen, setWaiveOpen] = useState(false);

  const { data: receivables, isLoading } = useQuery({
    queryKey: ["ci-receivables", "admin", instructorId],
    queryFn: () => listInstructorReceivables(instructorId),
  });

  const waiveMutation = useMutation({
    mutationFn: ({ receivableId, reason }: { receivableId: number; reason: string }) =>
      waiveCIReceivable(receivableId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["ci-receivables", "admin", instructorId],
      });
      toast.success("Receivable waived");
    },
    onError: (e: unknown) => {
      toast.error(getErrorMessage(e, "Failed to waive receivable"));
    },
  });

  const handleWaiveSubmit = async (itemId: number, reason: string) => {
    await waiveMutation.mutateAsync({ receivableId: itemId, reason });
  };

  return (
    <>
      <ExpandedDetailSection title="Training receivables">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : !receivables || receivables.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No receivables set up.</p>
        ) : (
          <div>
            {receivables.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Levels {r.levelFrom}–{r.levelTo}
                  </p>
                </div>
                <div className="text-sm font-medium tabular-nums shrink-0">
                  {formatRupees(r.fee)}
                </div>
                {statusBadge(r.status)}
                {r.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-800"
                    onClick={() => {
                      setWaiveTarget(r);
                      setWaiveOpen(true);
                    }}
                  >
                    <Slash className="h-3 w-3" />
                    Waive
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ExpandedDetailSection>

      <WaiveReceivableDialog
        item={waiveTarget ? toReceivableSummaryItem(waiveTarget) : null}
        open={waiveOpen}
        onOpenChange={setWaiveOpen}
        onSubmit={handleWaiveSubmit}
        isSubmitting={waiveMutation.isPending}
      />
    </>
  );
}

export default function CourseInstructorDetails({
  instructors,
}: CourseInstructorDetailsProps) {
  return (
    <ExpandedDetailSurface>
      {instructors.map((instructor, index) => (
        <div key={instructor.id}>
          {index > 0 ? <Separator /> : null}

          <ExpandedDetailSection title="Contact">
            <DetailFieldsGrid columns={3}>
              <DetailField label="Email" value={instructor.mail || "—"} />
              <DetailField label="Phone" value={instructor.phone || "—"} />
              <DetailField label="Born" value={fmtDate(instructor.dob)} />
              <DetailField
                label="Blood group"
                value={instructor.bloodGroup || "—"}
              />
              <DetailField
                label="Address"
                value={instructor.address || "—"}
                span={3}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          <Separator />

          <ExpandedDetailSection title="Background">
            <DetailFieldsGrid columns={3}>
              <DetailField
                label="Education"
                value={instructor.education || "—"}
              />
              <DetailField
                label="Occupation"
                value={instructor.occupation || "—"}
              />
              <DetailField
                label="Reference"
                value={instructor.reference || "—"}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          <Separator />

          <ExpandedDetailSection title="Record">
            <DetailFieldsGrid columns={3}>
              <DetailField
                label="Instructor ID"
                value={instructor.instructorId || "—"}
                mono
              />
              <DetailField
                label="Franchise"
                value={instructor.franchise?.name || "—"}
              />
              <DetailField label="Record ID" value={String(instructor.id)} mono />
              <DetailField label="Applied" value={fmtDate(instructor.createdAt)} />
              <DetailField
                label="Last updated"
                value={fmtDate(instructor.updatedAt)}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          <Separator />

          <InstructorReceivablesSection instructorId={instructor.id} />
        </div>
      ))}
    </ExpandedDetailSurface>
  );
}
