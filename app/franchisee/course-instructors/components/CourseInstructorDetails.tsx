"use client";

import React from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Droplet,
  GraduationCap,
  IdCard,
  Mail,
  Phone,
  User,
} from "lucide-react";
import {
  ContactPill,
  ContactPillGrid,
  ExpandedDetailSurface,
  IdentityHeader,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
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
    <ExpandedDetailSurface className="border-t border-border/60">
      <div className="space-y-3 p-3 md:p-4">
        <ProfileCard>
          <IdentityHeader
            name={courseInstructor.name || "Unnamed instructor"}
            subtitle={
              courseInstructor.instructorId
                ? `Instructor ${courseInstructor.instructorId}`
                : undefined
            }
            badge={
              courseInstructor.status ? (
                <StatusBadge label={courseInstructor.status} />
              ) : undefined
            }
          />
          <ProfileCardSection icon={User} label="Personal" divider>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={IdCard}
                label="Instructor ID"
                value={courseInstructor.instructorId || "—"}
              />
              <ContactPill
                icon={CalendarDays}
                label="Born"
                value={fmtDate(courseInstructor.dob)}
              />
              <ContactPill
                icon={CalendarDays}
                label="Age"
                value={calculateAge(courseInstructor.dob)}
              />
              <ContactPill
                icon={Droplet}
                label="Blood group"
                value={courseInstructor.bloodGroup || "—"}
              />
            </ContactPillGrid>
          </ProfileCardSection>

          <ProfileCardSection icon={Mail} label="Contact" divider>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={Mail}
                label="Email"
                value={courseInstructor.mail || "—"}
              />
              <ContactPill
                icon={Phone}
                label="Phone"
                value={courseInstructor.phone || "—"}
              />
              <ContactPill
                icon={Building2}
                label="City"
                value={courseInstructor.city || "—"}
              />
            </ContactPillGrid>
            <LabeledValue
              label="Address"
              value={courseInstructor.address || "—"}
              className="pt-2"
            />
          </ProfileCardSection>

          <ProfileCardSection icon={GraduationCap} label="Background" divider>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={GraduationCap}
                label="Education"
                value={courseInstructor.education || "—"}
              />
              <ContactPill
                icon={Briefcase}
                label="Occupation"
                value={courseInstructor.occupation || "—"}
              />
            </ContactPillGrid>
          </ProfileCardSection>
        </ProfileCard>
      </div>
    </ExpandedDetailSurface>
  );
}
