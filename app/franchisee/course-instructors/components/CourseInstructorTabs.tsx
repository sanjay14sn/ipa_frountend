"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CourseInstructorsTable from "./CourseInstructorsTable";
import ApprovalPendingCourseInstructorsTable from "./ApprovalPendingCourseInstructorsTable";
import CITrainingSessionsTab from "./CITrainingSessionsTab";
import type { CourseInstructorData } from "@/services/course-instructor.service";

interface CourseInstructorTabsProps {
  courseInstructors: CourseInstructorData[];
  approvalPendingCourseInstructors: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData,
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function CourseInstructorTabs({
  courseInstructors,
  approvalPendingCourseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
}: CourseInstructorTabsProps) {
  return (
    <Tabs defaultValue="regular" className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="regular" className="gap-2">
          Active & Training
          <Badge variant="secondary">{courseInstructors.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="approval" className="gap-2">
          Approval Pending
          <Badge variant="secondary">{approvalPendingCourseInstructors.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="ci-sessions" className="gap-2">
          CI Training Sessions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="regular">
        <CourseInstructorsTable
          courseInstructors={courseInstructors}
          onCourseInstructorUpdate={onCourseInstructorUpdate}
          onCourseInstructorDelete={onCourseInstructorDelete}
          onCourseInstructorEdit={onCourseInstructorEdit}
        />
      </TabsContent>

      <TabsContent value="approval">
        <ApprovalPendingCourseInstructorsTable
          courseInstructors={approvalPendingCourseInstructors}
        />
      </TabsContent>

      <TabsContent value="ci-sessions">
        <CITrainingSessionsTab />
      </TabsContent>
    </Tabs>
  );
}

