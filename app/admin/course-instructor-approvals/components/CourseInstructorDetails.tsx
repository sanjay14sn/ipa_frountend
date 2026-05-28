"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import { formatDate as fmtDate } from "@/lib/date-utils";

interface CourseInstructorDetailsProps {
  instructors: AdminCourseInstructorData[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove?: (instructor: AdminCourseInstructorData) => void;
  onReject?: (instructor: AdminCourseInstructorData) => void;
  showActions?: boolean;
}

export default function CourseInstructorDetails({
  instructors,
}: CourseInstructorDetailsProps) {
  return (
    <ExpandedDetailSurface>
      {instructors.map((instructor, index) => (
        <div key={instructor.id}>
          {index > 0 ? <Separator /> : null}

          <ExpandedDetailSection title="Contact">
            <DetailFieldsGrid columns={3}>
              <DetailField label="Email" value={instructor.mail || "—"} />
              <DetailField label="Phone" value={instructor.phone || "—"} />
              <DetailField label="Born" value={fmtDate(instructor.dob)} />
              <DetailField
                label="Blood group"
                value={instructor.bloodGroup || "—"}
              />
              <DetailField
                label="Address"
                value={instructor.address || "—"}
                span={3}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          <Separator />

          <ExpandedDetailSection title="Background">
            <DetailFieldsGrid columns={3}>
              <DetailField
                label="Education"
                value={instructor.education || "—"}
              />
              <DetailField
                label="Occupation"
                value={instructor.occupation || "—"}
              />
              <DetailField
                label="Reference"
                value={instructor.reference || "—"}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>

          <Separator />

          <ExpandedDetailSection title="Record">
            <DetailFieldsGrid columns={3}>
              <DetailField
                label="Instructor ID"
                value={instructor.instructorId || "—"}
                mono
              />
              <DetailField
                label="Franchise"
                value={instructor.franchise?.name || "—"}
              />
              <DetailField label="Record ID" value={String(instructor.id)} mono />
              <DetailField label="Applied" value={fmtDate(instructor.createdAt)} />
              <DetailField
                label="Last updated"
                value={fmtDate(instructor.updatedAt)}
              />
            </DetailFieldsGrid>
          </ExpandedDetailSection>
        </div>
      ))}
    </ExpandedDetailSurface>
  );
}
