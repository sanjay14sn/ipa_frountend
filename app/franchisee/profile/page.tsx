"use client";

import { Store } from "lucide-react";
import { PageHeaderCard, PageSkeleton, StatusBadge } from "@/components/shared";
import {
  IdentityHeader,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
} from "@/components/shared/profile";
import { useUser } from "@/context/user-context";
import { formatDate } from "@/lib/date-utils";
import { formatRupees } from "@/lib/currency-utils";

interface PayrollTerms {
  program?: { name?: string } | null;
  franchiseFee?: number;
  monthlyFee?: number;
  royalty?: number;
}

/** FR-21: payroll block, moved from the dashboard's ProfileCard. */
function PayrollTermsRow({ terms }: { terms: PayrollTerms }) {
  return (
    <div className="rounded-xl border bg-accent/30 p-3">
      {terms.program?.name ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {terms.program.name}
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
        <LabeledValue label="Fee" value={formatRupees(Number(terms.franchiseFee ?? 0))} />
        <LabeledValue label="Monthly" value={formatRupees(Number(terms.monthlyFee ?? 0))} />
        <LabeledValue label="Royalty" value={formatRupees(Number(terms.royalty ?? 0))} />
      </div>
    </div>
  );
}

/**
 * FR-21: the franchisee profile & settings page — the dashboard's ProfileCard
 * content (identity + franchise + payroll). Read-only: portal credentials are
 * issued by an admin and cannot be changed from here.
 */
export default function FranchiseeProfilePage() {
  const { user } = useUser();
  const profile = user?.profile;

  if (!user) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeaderCard
        title="Profile & settings"
        description="Your account and franchise details."
      />

      <div className="grid max-w-2xl grid-cols-1 items-start gap-4">
        <ProfileCard>
          <IdentityHeader
            name={profile?.name ?? user.name ?? "—"}
            subtitle={profile?.mail}
            badge={
              profile?.franchise?.status ? (
                <StatusBadge label={profile.franchise.status} />
              ) : undefined
            }
          />
          <ProfileCardSection divider>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <LabeledValue label="Phone" value={profile?.phone || "—"} />
              <LabeledValue label="City" value={profile?.city || "—"} />
            </div>
          </ProfileCardSection>
          <ProfileCardSection icon={Store} label="Franchise" divider>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <LabeledValue
                label="Name"
                value={profile?.franchise?.name || "—"}
              />
              <LabeledValue
                label="Type"
                value={profile?.franchise?.type || "—"}
              />
              <LabeledValue
                label="Approved"
                value={
                  profile?.franchise?.approvedAt
                    ? formatDate(profile.franchise.approvedAt)
                    : "—"
                }
              />
            </div>
            {profile?.franchise?.franchisePayroll ? (
              <PayrollTermsRow
                terms={profile.franchise.franchisePayroll as PayrollTerms}
              />
            ) : null}
          </ProfileCardSection>
        </ProfileCard>
      </div>
    </div>
  );
}
