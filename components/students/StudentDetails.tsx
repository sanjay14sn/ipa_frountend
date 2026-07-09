"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { StudentData } from "@/services/student.service";
import { getStudentLevelName } from "./student-helpers";
import { formatDate, calculateAge } from "@/lib/date-utils";

interface StudentDetailsProps {
  student: StudentData;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  const joinedDate = formatDate(student.dateOfJoining ?? student.createdAt);
  const primaryPhone =
    student.fatherContactNo || student.motherContactNo || "—";
  const status =
    student.status.charAt(0).toUpperCase() + student.status.slice(1);
  const stream =
    typeof student.stream === "string"
      ? student.stream
      : (student.stream as { name?: string })?.name ?? "—";

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Student details">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Roll number" value={student.rollNo || "—"} mono />
          <DetailField label="Joined" value={joinedDate} />
          <DetailField label="Status" value={status} />
          <DetailField label="Age" value={calculateAge(student.dateOfBirth)} />
          <DetailField label="Born" value={formatDate(student.dateOfBirth)} />
          <DetailField label="Gender" value={student.sex || "—"} />
          <DetailField label="ID status" value={student.idIssued || "—"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Academic">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Program" value={student.programId || "—"} />
          <DetailField label="Level" value={getStudentLevelName(student)} />
          <DetailField label="Standard" value={student.standard || "—"} />
          <DetailField label="Stream" value={stream} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Contact">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Email" value={student.mail || "—"} />
          <DetailField label="Phone" value={primaryPhone} />
          <DetailField
            label="Residential address"
            value={student.residentialAddress || "—"}
            span={3}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Parents info">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <DetailFieldsGrid columns={2}>
            <DetailField label="Father" value={student.fatherName || "—"} />
            <DetailField
              label="Contact"
              value={student.fatherContactNo || "—"}
            />
            <DetailField
              label="Occupation"
              value={student.fatherOccupation || "—"}
            />
            <DetailField
              label="Qualification"
              value={student.fatherQualification || "—"}
            />
          </DetailFieldsGrid>
          <DetailFieldsGrid columns={2}>
            <DetailField label="Mother" value={student.motherName || "—"} />
            <DetailField
              label="Contact"
              value={student.motherContactNo || "—"}
            />
            <DetailField
              label="Occupation"
              value={student.motherOccupation || "—"}
            />
            <DetailField
              label="Qualification"
              value={student.motherQualification || "—"}
            />
          </DetailFieldsGrid>
        </div>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
