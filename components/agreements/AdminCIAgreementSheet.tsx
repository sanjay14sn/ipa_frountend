"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import {
  getAdminCourseInstructorAgreement,
  listCIFranchises,
  type CIFranchiseAttachment,
} from "@/services/course-instructor.service";
import { getCIAgreementForAdmin } from "@/services/contracting.service";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";

interface AdminCIAgreementSheetProps {
  /** Open by agreement id — deep-linkable (`?agreementId=`) from CI agreement lists. */
  agreementId?: number | null;
  /** Open by instructor id from instructor-centric lists. */
  instructor?: { id: number; name?: string; programId?: number } | null;
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  PENDING_CI_SIGNATURE: "Awaiting CI signature",
  PENDING_FRANCHISEE_SIGNATURE: "Awaiting franchisee",
  SIGNED: "Signed",
  EXPIRED: "Expired",
};

/**
 * The single admin CI agreement detail surface: a right-side slide-over
 * matching AdminAgreementDetailSheet (the franchise agreements drawer).
 * Keyed by agreement id where the caller has one. Instructor mode resolves
 * the CI's franchise attachments: one agreement opens directly (the pre-
 * multi-franchise UX), several render a chooser first. Falls back to the
 * legacy latest-agreement endpoint when the franchises endpoint is absent.
 */
export function AdminCIAgreementSheet({
  agreementId = null,
  instructor = null,
  onClose,
}: AdminCIAgreementSheetProps) {
  const open = agreementId != null || instructor != null;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [instructor?.id, agreementId, open]);

  // Instructor mode: resolve the attachment list (null = endpoint absent →
  // legacy fallback below).
  const franchisesQuery = useQuery({
    queryKey: ["admin-ci-agreement", "by-instructor", instructor?.id],
    queryFn: async (): Promise<CIFranchiseAttachment[] | null> => {
      try {
        return await listCIFranchises(instructor!.id);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) return null;
        throw error;
      }
    },
    enabled: instructor != null && agreementId == null,
  });

  const attachments = franchisesQuery.data;
  const withAgreements = (attachments ?? []).filter((f) => f.agreement != null);
  const legacyFallback =
    instructor != null &&
    agreementId == null &&
    franchisesQuery.isSuccess &&
    attachments === null;

  const resolvedAgreementId =
    agreementId ??
    selectedId ??
    (withAgreements.length === 1 ? withAgreements[0].agreement!.id : null);

  const showChooser =
    instructor != null &&
    agreementId == null &&
    !legacyFallback &&
    withAgreements.length > 1 &&
    selectedId == null;

  const detailEnabled =
    open && (resolvedAgreementId != null || legacyFallback);
  const { data, isLoading: detailLoading } = useQuery({
    queryKey:
      resolvedAgreementId != null
        ? ["admin-ci-agreement", "by-agreement", resolvedAgreementId]
        : ["admin-ci-agreement", "legacy-by-instructor", instructor?.id],
    queryFn: () =>
      resolvedAgreementId != null
        ? getCIAgreementForAdmin(resolvedAgreementId)
        : getAdminCourseInstructorAgreement(instructor!.id),
    enabled: detailEnabled,
  });

  const isLoading =
    (instructor != null && agreementId == null && franchisesQuery.isLoading) ||
    (detailEnabled && detailLoading);
  const instructorName = data?.instructor?.name ?? instructor?.name;
  const noAgreements =
    !isLoading &&
    !showChooser &&
    ((detailEnabled && !data) ||
      (instructor != null &&
        agreementId == null &&
        !legacyFallback &&
        franchisesQuery.isSuccess &&
        withAgreements.length === 0));

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,95vw)]"
      >
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            {selectedId != null && withAgreements.length > 1 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-3 w-3" />
                All agreements
              </Button>
            ) : null}
          </div>
          <SheetTitle>
            {showChooser
              ? `Agreements for ${instructor?.name ?? "this instructor"}`
              : cleanAgreementTitle(data?.title, "Course Instructor Agreement")}
          </SheetTitle>
          <SheetDescription>
            {showChooser
              ? "This instructor holds one agreement per attached franchise — pick one to view."
              : instructorName
                ? `Agreement for ${instructorName} — signatures, terms, and training receivables.`
                : "View this CI agreement — signatures, terms, and training receivables."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agreement…
            </div>
          ) : showChooser ? (
            <div className="space-y-2">
              {withAgreements.map((f) => (
                <button
                  key={f.franchiseId}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedId(f.agreement!.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {f.franchiseName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(f.agreement?.phase && PHASE_LABELS[f.agreement.phase]) ??
                        f.agreement?.status ??
                        "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {f.isHandler ? <Badge>Handler</Badge> : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          ) : noAgreements ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {instructor
                ? "No CI agreement found for this instructor."
                : "Agreement not found."}
            </p>
          ) : data ? (
            <CIAgreementDetail agreement={data} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
