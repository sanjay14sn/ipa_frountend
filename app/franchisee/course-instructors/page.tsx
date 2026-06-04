"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { Plus } from "lucide-react";
import { useUser } from "@/context/user-context";
import { deleteCourseInstructorWithRevalidation, useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import { TablePageShell } from "@/components/shared";
import AddCourseInstructorModal from "./components/AddCourseInstructorModal";
import CourseInstructorTabs from "./components/CourseInstructorTabs";


export default function FranchiseeCourseInstructorsPage() {
  const { user } = useUser();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteCourseInstructorId, setDeleteCourseInstructorId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    courseInstructors: allCourseInstructors,
    isLoading,
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

  if (!user || !user.franchiseId || (isLoading && allCourseInstructors.length === 0)) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <TablePageShell
      title="Course instructors"
      description={`Manage course instructors for ${franchiseName}.`}
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
        onCourseInstructorUpdate={() => {
          void revalidate();
        }}
        onCourseInstructorDelete={(courseInstructorId) => {
          setDeleteCourseInstructorId(courseInstructorId);
          setIsDeleteModalOpen(true);
        }}
        onCourseInstructorEdit={() => {}}
      />

      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        variant="destructive"
        title="Delete Course Instructor"
        description="Are you sure you want to delete this course instructor? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteCourseInstructorId) return;
          await deleteCourseInstructorWithRevalidation(
            Number(deleteCourseInstructorId),
          );
          setIsDeleteModalOpen(false);
          setDeleteCourseInstructorId(null);
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
