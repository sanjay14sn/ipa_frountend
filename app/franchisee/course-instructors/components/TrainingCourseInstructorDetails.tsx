"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  DetailMessage,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { money } from "@/lib/ui-helpers";
import { TrainingCourseInstructorData } from "@/services/course-instructor.service";

interface TrainingCourseInstructorDetailsProps {
  courseInstructor: TrainingCourseInstructorData;
  onCourseInstructorUpdate?: (updated: TrainingCourseInstructorData) => void;
}

export default function TrainingCourseInstructorDetails({
  courseInstructor: ci,
}: TrainingCourseInstructorDetailsProps) {
  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Training">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Instructor ID" value={ci.instructorId || "—"} mono />
          <DetailField
            label="Training level"
            value={ci.trainingLevelName || "—"}
          />
          <DetailField label="Status" value={ci.status || "—"} />
          <DetailField label="Total amount" value={money(ci.amount ?? 0)} />
          <DetailField
            label="Paid"
            value={ci.paidAmount != null ? money(ci.paidAmount) : "—"}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      {ci.additionalDetails ? (
        <>
          <Separator />
          <ExpandedDetailSection title="Additional details">
            <DetailMessage>{ci.additionalDetails}</DetailMessage>
          </ExpandedDetailSection>
        </>
      ) : null}
    </ExpandedDetailSurface>
  );
}
