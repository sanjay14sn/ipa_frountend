"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CIAgreementDetail } from "@/components/agreements/CIAgreementDetail";
import {
  getAdminCourseInstructorAgreement,
  type AdminCourseInstructorAgreementRecord,
} from "@/services/course-instructor.service";
import type { CIAgreementRecord } from "@/services/ci-training.service";

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
    <Dialog
      open={!!instructor}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto sm:max-w-[1320px]">
        <DialogHeader>
          <DialogTitle>
            {(() => {
              const cleaned = (data?.title ?? "")
                .replace(/\s+\S*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\S*$/i, "")
                .replace(/\s+#?\d+\s*$/, "")
                .trim();
              return cleaned || "Course Instructor Agreement";
            })()}
          </DialogTitle>
          <DialogDescription>
            {instructor?.name ? `Agreement view for ${instructor.name}` : "Agreement view"}
          </DialogDescription>
        </DialogHeader>

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
          <CIAgreementDetail agreement={data as unknown as CIAgreementRecord} />
        )}
      </DialogContent>
    </Dialog>
  );
}

