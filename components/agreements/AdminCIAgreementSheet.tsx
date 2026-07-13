"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { getAdminCourseInstructorAgreement } from "@/services/course-instructor.service";
import { getCIAgreementForAdmin } from "@/services/contracting.service";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";

interface AdminCIAgreementSheetProps {
  /** Open by agreement id — deep-linkable (`?agreementId=`) from CI agreement lists. */
  agreementId?: number | null;
  /** Open by instructor id (latest agreement) from instructor-centric lists. */
  instructor?: { id: number; name?: string; programId?: number } | null;
  onClose: () => void;
}

/**
 * The single admin CI agreement detail surface: a right-side slide-over
 * matching AdminAgreementDetailSheet (the franchise agreements drawer).
 * Keyed by agreement id where the caller has one, or by instructor id from
 * instructor-centric tables (which resolves that CI's latest agreement).
 */
export function AdminCIAgreementSheet({
  agreementId = null,
  instructor = null,
  onClose,
}: AdminCIAgreementSheetProps) {
  const open = agreementId != null || instructor != null;

  const { data, isLoading } = useQuery({
    queryKey:
      agreementId != null
        ? ["admin-ci-agreement", "by-agreement", agreementId]
        : ["admin-ci-agreement", "by-instructor", instructor?.id],
    queryFn: () =>
      agreementId != null
        ? getCIAgreementForAdmin(agreementId)
        : getAdminCourseInstructorAgreement(instructor!.id),
    enabled: open,
  });

  const instructorName = data?.instructor?.name ?? instructor?.name;

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
          <SheetTitle>
            {cleanAgreementTitle(data?.title, "Course Instructor Agreement")}
          </SheetTitle>
          <SheetDescription>
            {instructorName
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
          ) : !data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {instructor
                ? "No CI agreement found for this instructor."
                : "Agreement not found."}
            </p>
          ) : (
            <CIAgreementDetail agreement={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
