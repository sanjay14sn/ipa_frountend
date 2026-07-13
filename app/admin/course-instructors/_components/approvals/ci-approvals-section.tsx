"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/dialog";
import {
  AdminCourseInstructorData,
  rejectCourseInstructor,
} from "@/services/course-instructor.service";
import { toast } from "sonner";
import ApproveCIModal from "./ApproveCIModal";
import CiApprovalsSummaryTable from "./CiApprovalsSummaryTable";

export function CiApprovalsSection() {
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<AdminCourseInstructorData | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminCourseInstructorData | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((n) => n + 1);
    void queryClient.invalidateQueries({
      queryKey: ["course-instructors", "admin", "summary"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["course-instructors", "admin", "details"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["course-instructors", "admin", "status"],
    });
  };

  const handleApproveInstructor = (instructor: AdminCourseInstructorData) => {
    setApproveTarget(instructor);
  };

  // ADM-14 (R2): rejection is irreversible — confirm first. Deliberately no
  // reason field: the reject endpoint takes no body.
  const handleRejectInstructor = (instructor: AdminCourseInstructorData) => {
    setRejectTarget(instructor);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await rejectCourseInstructor(rejectTarget.id);
      setRejectTarget(null);
      triggerRefresh();
    } catch {
      toast.error("Failed to reject instructor. Please try again.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <TablePageShell embed>
      {/* R6: the hub owns the page header. */}
      <TableSectionSurface>
        <CiApprovalsSummaryTable
          refreshTrigger={refreshTrigger}
          onApprove={handleApproveInstructor}
          onReject={handleRejectInstructor}
        />
      </TableSectionSurface>

      <ApproveCIModal
        instructor={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={triggerRefresh}
      />

      <ConfirmDialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        variant="destructive"
        title={
          rejectTarget?.name
            ? `Reject ${rejectTarget.name}'s application?`
            : "Reject this application?"
        }
        description="The applicant will no longer be able to proceed. This cannot be undone from here."
        confirmLabel="Reject application"
        onConfirm={confirmReject}
        isConfirming={isRejecting}
      />
    </TablePageShell>
  );
}
