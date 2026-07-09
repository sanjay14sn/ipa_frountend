"use client";
import { formatDate } from "@/lib/date-utils";

import {
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
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
  formatStatusLabel,
} from "@/components/shared";
import type { ProgramRequestRow } from "@/services/franchise.service";

interface ProgramRequestDetailsProps {
  request: ProgramRequestRow;
}

function fmt(date: string | null | undefined): string {
  if (!date) return "—";
  return formatDate(date);
}

export default function ProgramRequestDetails({
  request,
}: ProgramRequestDetailsProps) {
  const fe = request.franchisee;
  const franchise = request.franchise;
  const programName = request.program?.name ?? `Program #${request.programId}`;
  const location =
    [franchise?.city, franchise?.state].filter(Boolean).join(", ") || "—";

  return (
    <ExpandedDetailSurface className="border-t border-border/60">
      <div className="space-y-3 p-3 md:p-4">
        <EqualHeightRow split="2">
          <ProfileCard fillHeight>
            <IdentityHeader
              name={fe?.name ?? "—"}
              subtitle="Franchisee contact"
              badge={
                <StatusBadge label={formatStatusLabel(request.status)} />
              }
            />
            <ProfileCardSection icon={Mail} label="Contact" divider>
              <ContactPillGrid columns={2}>
                <ContactPill
                  icon={Mail}
                  label="Email"
                  value={fe?.mail ?? "—"}
                />
                <ContactPill
                  icon={Phone}
                  label="Phone"
                  value={fe?.phone ?? "—"}
                />
              </ContactPillGrid>
            </ProfileCardSection>
          </ProfileCard>

          <ProfileCard fillHeight>
            <ProfileCardSection icon={Building2} label="Franchise">
              <ContactPillGrid columns={1}>
                <ContactPill
                  icon={Building2}
                  label="Name"
                  value={franchise?.name ?? request.franchiseId}
                />
                <ContactPill
                  icon={MapPin}
                  label="Location"
                  value={location}
                />
              </ContactPillGrid>
              <LabeledValue
                label="Franchise Code"
                value={request.franchise?.code ?? "—"}
                mono
                className="pt-2"
              />
            </ProfileCardSection>
          </ProfileCard>
        </EqualHeightRow>

        <KeyFactsGrid columns={3}>
          <KeyFactCard
            icon={GraduationCap}
            label="Program"
            value={programName}
          />
          <KeyFactCard
            icon={CalendarDays}
            label="Requested"
            value={fmt(request.createdAt)}
          />
          <KeyFactCard
            icon={FileText}
            label="Current state"
            value={
              <StatusBadge
                label={formatStatusLabel(request.status ?? "Pending")}
              />
            }
          />
        </KeyFactsGrid>

        <ProfileCard>
          <ProfileCardSection
            icon={ShieldCheck}
            label="Approval workflow"
          >
            <p className="mb-3 text-sm text-muted-foreground">
              Agreement terms are created during the approval flow, then sent
              for signature.
            </p>
            <ContactPillGrid columns={2}>
              <ContactPill
                icon={GraduationCap}
                label="Program used"
                value={programName}
              />
              <ContactPill
                icon={FileText}
                label="Agreement terms"
                value="Created on admin approval"
              />
              <ContactPill
                icon={ShieldCheck}
                label="Signature flow"
                value="Triggered after terms saved"
              />
              <ContactPill
                icon={CalendarDays}
                label="Request state"
                value={request.status ?? "Pending"}
              />
            </ContactPillGrid>
          </ProfileCardSection>
        </ProfileCard>
      </div>
    </ExpandedDetailSurface>
  );
}
