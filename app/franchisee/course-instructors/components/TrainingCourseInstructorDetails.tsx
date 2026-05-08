"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { TrainingCourseInstructorData } from "@/services/course-instructor.service";

interface TrainingCourseInstructorDetailsProps {
  courseInstructor: TrainingCourseInstructorData;
  onCourseInstructorUpdate?: (updated: TrainingCourseInstructorData) => void;
}

export default function TrainingCourseInstructorDetails({
  courseInstructor: ci,
}: TrainingCourseInstructorDetailsProps) {
  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  return (
    <div className="p-4">
      <ExpandedDetailSurface>
        <ExpandedDetailSection title="Training Information">
          <DetailFieldsGrid columns={3}>
            <DetailField label="Instructor ID"  value={ci.instructorId || "N/A"} />
            <DetailField label="Training Level" value={ci.trainingLevelName || "—"} />
            <DetailField label="Status"         value={ci.status || "N/A"} />
            <DetailField label="Total Amount"   value={formatCurrency(ci.amount ?? 0)} />
            <DetailField
              label="Paid Amount"
              value={ci.paidAmount ? formatCurrency(ci.paidAmount) : "—"}
            />
          </DetailFieldsGrid>
        </ExpandedDetailSection>

        {ci.additionalDetails && (
          <>
            <Separator />
            <ExpandedDetailSection title="Additional Details">
              <p className="text-sm text-muted-foreground">{ci.additionalDetails}</p>
            </ExpandedDetailSection>
          </>
        )}
      </ExpandedDetailSurface>
    </div>
  );
}
