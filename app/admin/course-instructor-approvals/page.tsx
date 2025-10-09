"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import {
  approveCourseInstructor,
  rejectCourseInstructor,
} from "@/services/course-instructor.service";
import PendingCourseInstructorsTable from "./components/PendingCourseInstructorsTable";
import ApprovedCourseInstructorsTable from "./components/ApprovedCourseInstructorsTable";
import RejectedCourseInstructorsTable from "./components/RejectedCourseInstructorsTable";

export default function AdminCourseInstructorApprovalsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleApproveInstructor = async (
    instructor: AdminCourseInstructorData
  ) => {
    try {
      await approveCourseInstructor(instructor.id);
      triggerRefresh();
    } catch (error) {
      console.error("Error approving instructor:", error);
      alert("Failed to approve instructor. Please try again.");
    }
  };

  const handleRejectInstructor = async (
    instructor: AdminCourseInstructorData
  ) => {
    try {
      await rejectCourseInstructor(instructor.id);
      triggerRefresh();
    } catch (error) {
      console.error("Error rejecting instructor:", error);
      alert("Failed to reject instructor. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Course Instructor Approvals
          </h1>
          <p className="text-muted-foreground">
            Manage course instructor applications and approvals across
            franchises
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <PendingCourseInstructorsTable
            onApprove={handleApproveInstructor}
            onReject={handleRejectInstructor}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <ApprovedCourseInstructorsTable refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <RejectedCourseInstructorsTable refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
