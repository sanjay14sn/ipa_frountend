"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen } from "lucide-react";
import CourseInstructorsTable from "./CourseInstructorsTable";
import TrainingCourseInstructorsTable from "./TrainingCourseInstructorsTable";
import {
  CourseInstructorData,
  TrainingCourseInstructorData,
} from "@/services/course-instructor.service";

interface CourseInstructorTabsProps {
  courseInstructors: CourseInstructorData[];
  trainingCourseInstructors: TrainingCourseInstructorData[];
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
}

export default function CourseInstructorTabs({
  courseInstructors,
  trainingCourseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
  onTrainingCourseInstructorUpdate,
  onTrainingCourseInstructorDelete,
  onTrainingCourseInstructorEdit,
}: CourseInstructorTabsProps) {
  const [activeTab, setActiveTab] = useState<"regular" | "training">("regular");

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
