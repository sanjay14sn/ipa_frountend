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
import { CourseInstructorData } from "@/services/course-instructor.service";
import { useCourseInstructorPhotoMutations } from "@/hooks/api/course-instructor.hooks";
import { uploadedFileSrc, validatePhotoFile } from "@/lib/uploads";
import { calculateAge, formatDate } from "@/lib/date-utils";

interface CourseInstructorDetailsProps {
  courseInstructor: CourseInstructorData;
}

export default function CourseInstructorDetails({
  courseInstructor,
}: CourseInstructorDetailsProps) {
  const { upload, remove } = useCourseInstructorPhotoMutations("franchisee");

  const handleSelectFile = (file: File) => {
    const problem = validatePhotoFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate({ ciId: courseInstructor.id, file });
  };

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Photo">
        <ProfilePhotoControl
          name={courseInstructor.name}
          src={uploadedFileSrc(courseInstructor.photoPath)}
          onSelectFile={handleSelectFile}
          onRemove={() => remove.mutate({ ciId: courseInstructor.id })}
          isBusy={upload.isPending || remove.isPending}
        />
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Personal">
        <DetailFieldsGrid columns={3}>
          <DetailField
            label="Instructor ID"
            value={courseInstructor.instructorId || "—"}
            mono
          />
          <DetailField label="Born" value={formatDate(courseInstructor.dob)} />
          <DetailField label="Age" value={calculateAge(courseInstructor.dob)} />
          <DetailField
            label="Blood group"
            value={courseInstructor.bloodGroup || "—"}
          />
          {/* Multi-franchise: only rendered once the backend sends isHandler.
              The handler's name isn't in the franchisee contract — keep it generic. */}
          {courseInstructor.isHandler != null ? (
            <DetailField
              label="Managed by"
              value={
                courseInstructor.isHandler
                  ? "This franchise (handler)"
                  : "Partner franchise"
              }
            />
          ) : null}
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
