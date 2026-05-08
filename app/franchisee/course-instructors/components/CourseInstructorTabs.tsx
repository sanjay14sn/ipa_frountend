"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CourseInstructorsTable from "./CourseInstructorsTable";
import PaymentCourseInstructorsTable from "./PaymentCourseInstructorsTable";
import type { CourseInstructorData } from "@/services/course-instructor.service";

interface CourseInstructorTabsProps {
  courseInstructors: CourseInstructorData[];
  paymentCourseInstructors: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData,
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
  onPaymentCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData,
  ) => void;
  onPaymentCourseInstructorDelete?: (courseInstructorId: string) => void;
  onPaymentCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function CourseInstructorTabs({
  courseInstructors,
  paymentCourseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
  onPaymentCourseInstructorUpdate,
  onPaymentCourseInstructorDelete,
  onPaymentCourseInstructorEdit,
}: CourseInstructorTabsProps) {
  return (
    <Tabs defaultValue="regular" className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="regular" className="gap-2">
          Active & Training
          <Badge variant="secondary">{courseInstructors.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="payment" className="gap-2">
          Payment Pending
          <Badge variant="secondary">{paymentCourseInstructors.length}</Badge>
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

      <TabsContent value="payment">
        <PaymentCourseInstructorsTable
          courseInstructors={paymentCourseInstructors}
          onCourseInstructorUpdate={onPaymentCourseInstructorUpdate}
          onCourseInstructorDelete={onPaymentCourseInstructorDelete}
          onCourseInstructorEdit={onPaymentCourseInstructorEdit}
        />
      </TabsContent>
    </Tabs>
  );
}

