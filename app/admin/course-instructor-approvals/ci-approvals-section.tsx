"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import {
  AdminCourseInstructorData,
  rejectCourseInstructor,
} from "@/services/course-instructor.service";
import { toast } from "sonner";
import ApproveCIModal from "./components/ApproveCIModal";
import CiApprovalsSummaryTable from "./components/CiApprovalsSummaryTable";

export function CiApprovalsSection() {
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<AdminCourseInstructorData | null>(null);
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

  const handleRejectInstructor = async (instructor: AdminCourseInstructorData) => {
    try {
      await rejectCourseInstructor(instructor.id);
      triggerRefresh();
    } catch {
      toast.error("Failed to reject instructor. Please try again.");
    }
  };

  return (
    <TablePageShell
      title="Course Instructor Approvals"
      description="Manage course instructor applications and approval states across franchises."
    >
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
    </TablePageShell>
  );
}
