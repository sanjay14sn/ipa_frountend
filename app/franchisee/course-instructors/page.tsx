"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useUser } from "@/context/user-context";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import { TablePageShell, PageSkeleton } from "@/components/shared";
import AddCourseInstructorModal from "./_components/AddCourseInstructorModal";
import CourseInstructorTabs from "./_components/CourseInstructorTabs";


export default function FranchiseeCourseInstructorsPage() {
  const { user } = useUser();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    courseInstructors: allCourseInstructors,
    isLoading,
    error,
    revalidate,
  } = useCourseInstructors();

  const activeRows = useMemo(
    () => allCourseInstructors.filter((item) => item.status === "Approved"),
    [allCourseInstructors],
  );
  const trainingRows = useMemo(
    () => allCourseInstructors.filter((item) => item.status === "Training"),
    [allCourseInstructors],
  );
  const approvalPendingRows = useMemo(
    () => allCourseInstructors.filter((item) => item.status === "Pending"),
    [allCourseInstructors],
  );

  const regularRows = useMemo(
    () => [...activeRows, ...trainingRows],
    [activeRows, trainingRows],
  );
  const franchiseName = user?.profile?.franchise?.name || user?.franchiseName || "your franchise";

  // FR-16: loading is threaded into the table (skeleton rows) instead of
  // blanking the whole page — the header and tabs paint immediately.
  if (!user || !user.franchiseId) {
    return <PageSkeleton />;
  }

  return (
    <TablePageShell
      title="Course instructors"
      description={`Course instructors handled by or attached to ${franchiseName}.`}
      actions={
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course Instructor
        </Button>
      }
    >
      <CourseInstructorTabs
        courseInstructors={regularRows}
        approvalPendingCourseInstructors={approvalPendingRows}
        loading={isLoading && allCourseInstructors.length === 0}
        error={error}
        onRetry={() => void revalidate()}
        onCourseInstructorUpdate={() => {
          void revalidate();
        }}
      />

      <AddCourseInstructorModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          void revalidate();
        }}
      />
    </TablePageShell>
  );
}
