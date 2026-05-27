"use client";

import React from "react";
import {
  Briefcase,
  CalendarDays,
  Droplet,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";
import {
  ContactPill,
  ContactPillGrid,
  EqualHeightRow,
  ExpandedDetailSurface,
  IdentityHeader,
  KeyFactCard,
  KeyFactsGrid,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
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
    <ExpandedDetailSurface className="border-t border-border/60">
      <div className="space-y-4 p-3 md:p-4">
        {instructors.map((instructor) => (
          <div key={instructor.id} className="space-y-3">
            <EqualHeightRow split="2">
              <ProfileCard fillHeight>
                <IdentityHeader
                  name={instructor.name || "Unnamed instructor"}
                  subtitle={
                    instructor.instructorId
                      ? `Instructor ${instructor.instructorId}`
                      : `Record #${instructor.id}`
                  }
                  badge={
                    instructor.status ? (
                      <StatusBadge label={instructor.status} />
                    ) : undefined
                  }
                />
                <ProfileCardSection icon={User} label="Contact" divider>
                  <ContactPillGrid columns={2}>
                    <ContactPill
                      icon={Mail}
                      label="Email"
                      value={instructor.mail || "—"}
                    />
                    <ContactPill
                      icon={Phone}
                      label="Phone"
                      value={instructor.phone || "—"}
                    />
                    <ContactPill
                      icon={CalendarDays}
                      label="Born"
                      value={fmtDate(instructor.dob)}
                    />
                    <ContactPill
                      icon={Droplet}
                      label="Blood group"
                      value={instructor.bloodGroup || "—"}
                    />
                  </ContactPillGrid>
                  <LabeledValue
                    label="Address"
                    value={instructor.address || "—"}
                    className="pt-2"
                  />
                </ProfileCardSection>
              </ProfileCard>

              <ProfileCard fillHeight>
                <ProfileCardSection icon={GraduationCap} label="Background">
                  <ContactPillGrid columns={1}>
                    <ContactPill
                      icon={GraduationCap}
                      label="Education"
                      value={instructor.education || "—"}
                    />
                    <ContactPill
                      icon={Briefcase}
                      label="Occupation"
                      value={instructor.occupation || "—"}
                    />
                    <ContactPill
                      icon={Users}
                      label="Reference"
                      value={instructor.reference || "—"}
                    />
                  </ContactPillGrid>
                </ProfileCardSection>
              </ProfileCard>
            </EqualHeightRow>

            <KeyFactsGrid columns={3}>
              <KeyFactCard
                icon={IdCard}
                label="Instructor ID"
                value={instructor.instructorId || "—"}
              />
              <KeyFactCard
                icon={MapPin}
                label="Franchise"
                value={instructor.franchise?.name || "—"}
              />
              <KeyFactCard
                icon={FileText}
                label="Record ID"
                value={String(instructor.id)}
              />
              <KeyFactCard
                icon={CalendarDays}
                label="Applied"
                value={fmtDate(instructor.createdAt)}
              />
              <KeyFactCard
                icon={CalendarDays}
                label="Last updated"
                value={fmtDate(instructor.updatedAt)}
              />
            </KeyFactsGrid>
          </div>
        ))}
      </div>
    </ExpandedDetailSurface>
  );
}
