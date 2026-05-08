"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import {
  AdminCourseInstructorData,
} from "@/services/course-instructor.service";

interface CourseInstructorDetailsProps {
  instructors: AdminCourseInstructorData[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove?: (instructor: AdminCourseInstructorData) => void;
  onReject?: (instructor: AdminCourseInstructorData) => void;
  showActions?: boolean;
}

function calculateAge(dateOfBirth: string | Date | undefined): string {
  if (!dateOfBirth) return "N/A";
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return `${age} years`;
}

function fmtDate(value: string | Date | undefined): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

export default function CourseInstructorDetails({
  instructors,
}: CourseInstructorDetailsProps) {
  return (
    <div className="p-4">
      {instructors.map((instructor) => {
        return (
          <div key={instructor.id}>
            <ExpandedDetailSurface>
              <ExpandedDetailSection title="Course Instructor Information">
                <DetailFieldsGrid columns={3}>
                  <DetailField label="Name" value={instructor.name || "N/A"} />
                  <DetailField label="Email" value={instructor.mail || "N/A"} />
                  <DetailField label="Phone" value={instructor.phone || "N/A"} />
                  <DetailField label="Date of birth" value={fmtDate(instructor.dob)} />
                  <DetailField label="Blood group" value={instructor.bloodGroup || "N/A"} />
                  <DetailField label="Address" value={instructor.address || "N/A"} span={3} />
                  <DetailField label="Education" value={instructor.education || "N/A"} />
                  <DetailField label="Occupation" value={instructor.occupation || "N/A"} />
                  <DetailField label="Reference" value={instructor.reference || "N/A"} />
                </DetailFieldsGrid>
              </ExpandedDetailSection>

              <Separator />

              <ExpandedDetailSection title="Application Details">
                <DetailFieldsGrid columns={3}>
                  <DetailField label="Instructor ID" value={instructor.instructorId || "N/A"} />
                  <DetailField label="Franchise" value={instructor.franchise?.name || "N/A"} />
                  <DetailField label="Current status" value={instructor.status || "N/A"} />
                  <DetailField label="Application date" value={fmtDate(instructor.createdAt)} />
                  <DetailField label="Last updated" value={fmtDate(instructor.updatedAt)} />
                  <DetailField label="Record ID" value={String(instructor.id)} />
                </DetailFieldsGrid>
              </ExpandedDetailSection>
            </ExpandedDetailSurface>
          </div>
        );
      })}
    </div>
  );
}
