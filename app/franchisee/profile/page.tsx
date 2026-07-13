"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeaderCard, PageSkeleton, StatusBadge } from "@/components/shared";
import {
  IdentityHeader,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
} from "@/components/shared/profile";
import { useUser } from "@/context/user-context";
import { changeFranchiseePassword } from "@/services/auth.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";
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
 * FR-21(b): change-password form — same validation/endpoint as the
 * ChangePasswordGate, but as a settings card (success = toast + reset, no
 * flag juggling).
 */
function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changeFranchiseePassword(currentPassword, newPassword);
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getUserFriendlyMessage(err, "Could not update password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProfileCard>
      <ProfileCardSection label="Change password">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </ProfileCardSection>
    </ProfileCard>
  );
}

/**
 * FR-21: the franchisee profile & settings page. Receives the dashboard's
 * ProfileCard content (identity + franchise + payroll) and adds the
 * change-password form. Read-only apart from the password (profile editing
 * needs backend).
 */
export default function FranchiseeProfilePage() {
  const { user } = useUser();
  const profile = user?.profile;

  if (!user) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeaderCard
        title="Profile & settings"
        description="Your account, franchise details, and password."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
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

        <ChangePasswordCard />
      </div>
    </div>
  );
}
