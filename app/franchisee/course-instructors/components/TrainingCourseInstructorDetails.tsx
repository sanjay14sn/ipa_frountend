"use client";

import React from "react";
import { GraduationCap, IndianRupee, Info, Layers } from "lucide-react";
import {
  ExpandedDetailSurface,
  KeyFactCard,
  KeyFactsGrid,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
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
    <ExpandedDetailSurface className="border-t border-border/60">
      <div className="space-y-3 p-3 md:p-4">
        <KeyFactsGrid columns={4}>
          <KeyFactCard
            icon={Info}
            label="Instructor ID"
            value={ci.instructorId || "—"}
          />
          <KeyFactCard
            icon={Layers}
            label="Training level"
            value={ci.trainingLevelName || "—"}
          />
          <KeyFactCard
            icon={GraduationCap}
            label="Status"
            value={
              ci.status ? <StatusBadge label={ci.status} /> : "—"
            }
          />
          <KeyFactCard
            icon={IndianRupee}
            label="Total amount"
            value={money(ci.amount ?? 0)}
          />
          <KeyFactCard
            icon={IndianRupee}
            label="Paid"
            value={ci.paidAmount != null ? money(ci.paidAmount) : "—"}
          />
        </KeyFactsGrid>

        {ci.additionalDetails ? (
          <ProfileCard>
            <ProfileCardSection icon={Info} label="Additional details">
              <p className="text-sm text-card-foreground">
                {ci.additionalDetails}
              </p>
            </ProfileCardSection>
          </ProfileCard>
        ) : null}
      </div>
    </ExpandedDetailSurface>
  );
}
