"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { DetailDialog } from "@/components/shared/dialog";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import { getAdminCourseInstructorAgreement } from "@/services/course-instructor.service";
import { cleanAgreementTitle } from "@/components/agreements/agreement-utils";

interface AdminCIAgreementDialogProps {
  instructor: { id: number; name?: string; programId?: number } | null;
  onClose: () => void;
}

export function AdminCIAgreementDialog({
  instructor,
  onClose,
}: AdminCIAgreementDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ci-agreement", instructor?.id],
    queryFn: () => getAdminCourseInstructorAgreement(instructor!.id),
    enabled: !!instructor,
  });

  return (
    <DetailDialog
      open={!!instructor}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="2xl"
      title={cleanAgreementTitle(data?.title, "Course Instructor Agreement")}
      description={
        instructor?.name
          ? `Agreement view for ${instructor.name}`
          : "Agreement view"
      }
    >

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agreement...
          </div>
        ) : !data ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No CI agreement found for this instructor.
          </div>
        ) : (
          <CIAgreementDetail agreement={data} />
        )}
    </DetailDialog>
  );
}

