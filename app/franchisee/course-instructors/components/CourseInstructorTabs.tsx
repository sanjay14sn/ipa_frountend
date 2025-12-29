"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard } from "lucide-react";
import CourseInstructorsTable from "./CourseInstructorsTable";
import PaymentCourseInstructorsTable from "./PaymentCourseInstructorsTable";
import {
  CourseInstructorData,
} from "@/services/course-instructor.service";

interface CourseInstructorTabsProps {
  courseInstructors: CourseInstructorData[];
  paymentCourseInstructors: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
  onPaymentCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
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
  const [activeTab, setActiveTab] = useState<"regular" | "payment">("regular");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        <Button
          variant={activeTab === "regular" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("regular")}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Regular Course Instructors
          <Badge variant="secondary" className="ml-1">
            {courseInstructors.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "payment" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("payment")}
          className="flex items-center gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Payment Pending
          <Badge variant="secondary" className="ml-1">
            {paymentCourseInstructors.length}
          </Badge>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "regular" && (
        <CourseInstructorsTable
          courseInstructors={courseInstructors}
          onCourseInstructorUpdate={onCourseInstructorUpdate}
          onCourseInstructorDelete={onCourseInstructorDelete}
          onCourseInstructorEdit={onCourseInstructorEdit}
        />
      )}

      {activeTab === "payment" && (
        <PaymentCourseInstructorsTable
          courseInstructors={paymentCourseInstructors}
          onCourseInstructorUpdate={onPaymentCourseInstructorUpdate}
          onCourseInstructorDelete={onPaymentCourseInstructorDelete}
          onCourseInstructorEdit={onPaymentCourseInstructorEdit}
        />
      )}
    </div>
  );
}
