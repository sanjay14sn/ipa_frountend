"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, CreditCard } from "lucide-react";
import CourseInstructorsTable from "./CourseInstructorsTable";
import TrainingCourseInstructorsTable from "./TrainingCourseInstructorsTable";
import PaymentCourseInstructorsTable from "./PaymentCourseInstructorsTable";
import {
  CourseInstructorData,
  TrainingCourseInstructorData,
} from "@/services/course-instructor.service";

interface CourseInstructorTabsProps {
  courseInstructors: CourseInstructorData[];
  trainingCourseInstructors: TrainingCourseInstructorData[];
  paymentCourseInstructors: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
  onTrainingCourseInstructorUpdate?: (
    updatedCourseInstructor: TrainingCourseInstructorData
  ) => void;
  onTrainingCourseInstructorDelete?: (courseInstructorId: string) => void;
  onTrainingCourseInstructorEdit?: (
    courseInstructor: TrainingCourseInstructorData
  ) => void;
  onPaymentCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onPaymentCourseInstructorDelete?: (courseInstructorId: string) => void;
  onPaymentCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function CourseInstructorTabs({
  courseInstructors,
  trainingCourseInstructors,
  paymentCourseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
  onTrainingCourseInstructorUpdate,
  onTrainingCourseInstructorDelete,
  onTrainingCourseInstructorEdit,
  onPaymentCourseInstructorUpdate,
  onPaymentCourseInstructorDelete,
  onPaymentCourseInstructorEdit,
}: CourseInstructorTabsProps) {
  const [activeTab, setActiveTab] = useState<"regular" | "training" | "payment">("regular");

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
        <Button
          variant={activeTab === "training" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("training")}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Training Course Instructors
          <Badge variant="secondary" className="ml-1">
            {trainingCourseInstructors.length}
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

      {activeTab === "training" && (
        <TrainingCourseInstructorsTable
          courseInstructors={trainingCourseInstructors}
          onCourseInstructorUpdate={onTrainingCourseInstructorUpdate}
          onCourseInstructorDelete={onTrainingCourseInstructorDelete}
          onCourseInstructorEdit={onTrainingCourseInstructorEdit}
        />
      )}
    </div>
  );
}
