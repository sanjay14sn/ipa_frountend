"use client";

import React from "react";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { CourseInstructorData } from "@/services/course-instructor.service";

function calculateAge(dob: Date | string | undefined): string {
  if (!dob) return "N/A";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} years`;
}

function fmtDate(value: Date | string | undefined): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

interface CourseInstructorDetailsProps {
  courseInstructor: CourseInstructorData;
}

export default function CourseInstructorDetails({
  courseInstructor,
}: CourseInstructorDetailsProps) {
  return (
    <div className="p-4">
      <ExpandedDetailSurface>
        <ExpandedDetailSection title="Course Instructor Information">
          <DetailFieldsGrid columns={3}>
            <DetailField label="Instructor ID" value={courseInstructor.instructorId || "N/A"} />
            <DetailField label="Date of birth" value={fmtDate(courseInstructor.dob)} />
            <DetailField label="Age"           value={calculateAge(courseInstructor.dob)} />
            <DetailField label="Blood group"   value={courseInstructor.bloodGroup || "N/A"} />
            <DetailField label="City"          value={courseInstructor.city || "N/A"} />
            <DetailField label="Email"         value={courseInstructor.mail || "N/A"} />
            <DetailField label="Phone"         value={courseInstructor.phone || "N/A"} />
            <DetailField label="Education"     value={courseInstructor.education || "N/A"} />
            <DetailField label="Occupation"    value={courseInstructor.occupation || "N/A"} />
            <DetailField label="Status"        value={courseInstructor.status || "N/A"} />
            <DetailField label="Address"       value={courseInstructor.address || "N/A"} span={3} />
          </DetailFieldsGrid>
        </ExpandedDetailSection>
      </ExpandedDetailSurface>
    </div>
  );
}
