"use client";

import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { ProfilePhotoControl } from "@/components/shared/profile";
import type { StudentData } from "@/services/student.service";
import { useStudentPhotoMutations } from "@/hooks/api/student.hooks";
import { uploadedFileSrc, validatePhotoFile } from "@/lib/uploads";
import { getStudentLevelName } from "./student-helpers";
import { formatDate, calculateAge } from "@/lib/date-utils";

interface StudentDetailsProps {
  student: StudentData;
  /** Picks the photo mutation audience routes; display is identical. */
  mode?: "franchise" | "admin";
}

export default function StudentDetails({
  student,
  mode = "franchise",
}: StudentDetailsProps) {
  const joinedDate = formatDate(student.dateOfJoining ?? student.createdAt);
  const primaryPhone =
    student.fatherContactNo || student.motherContactNo || "—";
  const status =
    student.status.charAt(0).toUpperCase() + student.status.slice(1);
  const stream =
    typeof student.stream === "string"
      ? student.stream
      : (student.stream as { name?: string })?.name ?? "—";

  const { upload, remove } = useStudentPhotoMutations(mode);

  const handleSelectFile = (file: File) => {
    const problem = validatePhotoFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate({ studentId: student.id, file });
  };

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Photo">
        <ProfilePhotoControl
          name={student.name}
          src={uploadedFileSrc(student.photoPath)}
          onSelectFile={handleSelectFile}
          onRemove={() => remove.mutate({ studentId: student.id })}
          isBusy={upload.isPending || remove.isPending}
        />
      </ExpandedDetailSection>

      <Separator />

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
