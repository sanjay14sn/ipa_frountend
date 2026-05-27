"use client";

import {
  Briefcase,
  Cake,
  GraduationCap,
  IdCard,
  Layers,
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
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
} from "@/components/shared";
import type { StudentData } from "@/services/student.service";
import { getStudentLevelName } from "../utils/student-helpers";
import { formatDate, calculateAge } from "@/lib/date-utils";

interface StudentDetailsProps {
  student: StudentData;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  const joinedDate = formatDate(student.dateOfJoining ?? student.createdAt);
  const primaryPhone =
    student.fatherContactNo || student.motherContactNo || "—";

  return (
    <ExpandedDetailSurface className="border-t border-border/60">
      <div className="space-y-3 p-3 md:p-4">
        <EqualHeightRow split="2">
          <ProfileCard fillHeight>
            <IdentityHeader
              name={student.name}
              subtitle={`Roll ${student.rollNo || "—"} · joined ${joinedDate}`}
              badge={
                <StatusBadge
                  label={student.isActive ? "Active" : "Inactive"}
                />
              }
            />
            <ProfileCardSection icon={User} label="Student details" divider>
              <ContactPillGrid columns={2}>
                <ContactPill
                  icon={Cake}
                  label="Age"
                  value={calculateAge(student.dateOfBirth)}
                />
                <ContactPill
                  icon={Cake}
                  label="Born"
                  value={formatDate(student.dateOfBirth)}
                />
                <ContactPill
                  icon={User}
                  label="Gender"
                  value={student.sex || "—"}
                />
                <ContactPill
                  icon={IdCard}
                  label="ID status"
                  value={student.idIssued || "—"}
                />
              </ContactPillGrid>
            </ProfileCardSection>
          </ProfileCard>

          <ProfileCard fillHeight>
            <ProfileCardSection icon={GraduationCap} label="Academic">
              <ContactPillGrid columns={2}>
                <ContactPill
                  icon={Layers}
                  label="Program"
                  value={student.programId || "—"}
                />
                <ContactPill
                  icon={Layers}
                  label="Level"
                  value={getStudentLevelName(student)}
                />
                <ContactPill
                  icon={Layers}
                  label="Standard"
                  value={student.standard || "—"}
                />
                <ContactPill
                  icon={Layers}
                  label="Stream"
                  value={
                    typeof student.stream === "string"
                      ? student.stream
                      : (student.stream as { name?: string })?.name ?? "—"
                  }
                />
              </ContactPillGrid>
            </ProfileCardSection>
            <ProfileCardSection icon={Mail} label="Contact" divider>
              <ContactPillGrid columns={2}>
                <ContactPill
                  icon={Mail}
                  label="Email"
                  value={student.mail || "—"}
                />
                <ContactPill icon={Phone} label="Phone" value={primaryPhone} />
              </ContactPillGrid>
              <LabeledValue
                label="Residential address"
                value={student.residentialAddress || "—"}
                className="pt-2"
              />
            </ProfileCardSection>
          </ProfileCard>
        </EqualHeightRow>

        <ProfileCard>
          <ProfileCardSection icon={Users} label="Parents">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <IdentityHeader
                  name={student.fatherName || "—"}
                  subtitle="Father"
                  avatarSize="sm"
                  avatarTone="muted"
                />
                <ContactPillGrid columns={1}>
                  <ContactPill
                    icon={Phone}
                    label="Contact"
                    value={student.fatherContactNo || "—"}
                  />
                  <ContactPill
                    icon={Briefcase}
                    label="Occupation"
                    value={student.fatherOccupation || "—"}
                  />
                  <ContactPill
                    icon={GraduationCap}
                    label="Qualification"
                    value={student.fatherQualification || "—"}
                  />
                </ContactPillGrid>
              </div>
              <div className="space-y-2 border-t border-border pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                <IdentityHeader
                  name={student.motherName || "—"}
                  subtitle="Mother"
                  avatarSize="sm"
                  avatarTone="muted"
                />
                <ContactPillGrid columns={1}>
                  <ContactPill
                    icon={Phone}
                    label="Contact"
                    value={student.motherContactNo || "—"}
                  />
                  <ContactPill
                    icon={Briefcase}
                    label="Occupation"
                    value={student.motherOccupation || "—"}
                  />
                  <ContactPill
                    icon={GraduationCap}
                    label="Qualification"
                    value={student.motherQualification || "—"}
                  />
                </ContactPillGrid>
              </div>
            </div>
          </ProfileCardSection>
        </ProfileCard>

        {student.residentialAddress ? null : (
          <ProfileCard>
            <ProfileCardSection icon={MapPin} label="Address">
              <p className="text-sm text-muted-foreground">
                No residential address on file.
              </p>
            </ProfileCardSection>
          </ProfileCard>
        )}
      </div>
    </ExpandedDetailSurface>
  );
}
