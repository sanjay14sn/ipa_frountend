"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { StudentData } from "@/services/student.service";
import { getStudentLevelName } from "../utils/student-helpers";

interface StudentDetailsProps {
  student: StudentData;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function calculateAge(value: Date | string | undefined): string {
  if (!value) return "N/A";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "N/A";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return `${age} years`;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Student information">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Roll number" value={student.rollNo || "N/A"} />
          <DetailField label="Age" value={calculateAge(student.dateOfBirth)} />
          <DetailField label="Date of birth" value={formatDate(student.dateOfBirth)} />
          <DetailField label="Gender" value={student.sex || "N/A"} />
          <DetailField label="Status" value={student.isActive ? "Active" : "Inactive"} />
          <DetailField label="ID status" value={student.idIssued || "N/A"} />
          <DetailField label="Joined" value={formatDate(student.dateOfJoining ?? student.createdAt)} />
          <DetailField label="Student ID" value={student.id} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Academic information">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Program" value={student.programId || "N/A"} />
          <DetailField label="Level" value={getStudentLevelName(student)} />
          <DetailField label="Standard" value={student.standard || "N/A"} />
          <DetailField label="Stream" value={student.stream || "N/A"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Parent information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Father" value={student.fatherName || "N/A"} />
          <DetailField
            label="Father contact"
            value={student.fatherContactNo || "N/A"}
          />
          <DetailField
            label="Father occupation"
            value={student.fatherOccupation || "N/A"}
          />
          <DetailField label="Mother" value={student.motherName || "N/A"} />
          <DetailField
            label="Mother contact"
            value={student.motherContactNo || "N/A"}
          />
          <DetailField
            label="Mother occupation"
            value={student.motherOccupation || "N/A"}
          />
          <DetailField
            label="Father qualification"
            value={student.fatherQualification || "N/A"}
          />
          <DetailField
            label="Mother qualification"
            value={student.motherQualification || "N/A"}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Contact information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Email" value={student.mail || "N/A"} />
          <DetailField
            label="Primary phone"
            value={student.fatherContactNo || student.motherContactNo || "N/A"}
          />
          <DetailField
            label="Residential address"
            value={student.residentialAddress || "N/A"}
            span={3}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
