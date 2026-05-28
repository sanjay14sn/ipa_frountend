"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { CourseInstructorData } from "@/services/course-instructor.service";
import { calculateAge, formatDate as fmtDate } from "@/lib/date-utils";

interface CourseInstructorDetailsProps {
  courseInstructor: CourseInstructorData;
}

export default function CourseInstructorDetails({
  courseInstructor,
}: CourseInstructorDetailsProps) {
  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Personal">
        <DetailFieldsGrid columns={3}>
          <DetailField
            label="Instructor ID"
            value={courseInstructor.instructorId || "—"}
            mono
          />
          <DetailField label="Born" value={fmtDate(courseInstructor.dob)} />
          <DetailField label="Age" value={calculateAge(courseInstructor.dob)} />
          <DetailField
            label="Blood group"
            value={courseInstructor.bloodGroup || "—"}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Contact">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Email" value={courseInstructor.mail || "—"} />
          <DetailField label="Phone" value={courseInstructor.phone || "—"} />
          <DetailField label="City" value={courseInstructor.city || "—"} />
          <DetailField
            label="Address"
            value={courseInstructor.address || "—"}
            span={3}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Background">
        <DetailFieldsGrid columns={3}>
          <DetailField
            label="Education"
            value={courseInstructor.education || "—"}
          />
          <DetailField
            label="Occupation"
            value={courseInstructor.occupation || "—"}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
