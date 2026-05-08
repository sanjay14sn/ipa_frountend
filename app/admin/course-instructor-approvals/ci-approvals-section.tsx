"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { AdminCourseInstructorData, rejectCourseInstructor } from "@/services/course-instructor.service";
import { useToast } from "@/hooks/use-toast";
import PendingCourseInstructorsTable from "./components/PendingCourseInstructorsTable";
import ApprovedCourseInstructorsTable from "./components/ApprovedCourseInstructorsTable";
import RejectedCourseInstructorsTable from "./components/RejectedCourseInstructorsTable";
import ApproveCIModal from "./components/ApproveCIModal";

export function CiApprovalsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<AdminCourseInstructorData | null>(null);

  const triggerRefresh = () => {
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
      toast({ title: "Error", description: "Failed to reject instructor. Please try again.", variant: "destructive" });
    }
  };

  return (
    <TablePageShell
      title="Course Instructor Approvals"
      description="Manage course instructor applications and approval states across franchises."
    >
      <TableSectionSurface>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="pending">Pending approvals</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            <PendingCourseInstructorsTable
              onApprove={handleApproveInstructor}
              onReject={handleRejectInstructor}
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-4">
            <ApprovedCourseInstructorsTable />
          </TabsContent>

          <TabsContent value="rejected" className="mt-4 space-y-4">
            <RejectedCourseInstructorsTable />
          </TabsContent>
        </Tabs>
      </TableSectionSurface>

      <ApproveCIModal
        instructor={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={triggerRefresh}
      />
    </TablePageShell>
  );
}
