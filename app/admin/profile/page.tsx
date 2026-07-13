"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { PageHeaderCard, PageSkeleton, StatusBadge } from "@/components/shared";
import {
  IdentityHeader,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
} from "@/components/shared/profile";
import { getAdminProfile } from "@/services/auth.service";
import { queryKeys } from "@/hooks/api/query-keys";

/**
 * ADM-29: read-only admin profile — the header dropdown's "Profile &
 * settings" target for both admin roles. No change-password form: no admin
 * endpoint exists (deferred to backend work).
 */
export default function AdminProfilePage() {
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.adminProfile(),
    queryFn: getAdminProfile,
  });
  const profile = profileQuery.data;

  if (profileQuery.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeaderCard
        title="Profile & settings"
        description="Your admin account details."
      />

      {profileQuery.isError ? (
        <p className="rounded-2xl border bg-card p-4 text-sm text-destructive shadow-sm">
          Couldn&apos;t load your profile. Refresh to try again.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ProfileCard>
            <IdentityHeader
              name={profile?.name ?? "—"}
              subtitle={profile?.emailId}
              badge={
                profile?.role ? (
                  <StatusBadge
                    label={profile.role === "super" ? "Super admin" : "Staff admin"}
                    tone={profile.role === "super" ? "info" : "neutral"}
                  />
                ) : undefined
              }
            />
            <ProfileCardSection icon={ShieldCheck} label="Account" divider>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <LabeledValue label="Role" value={profile?.role ?? "—"} />
                <LabeledValue label="State" value={profile?.state || "—"} />
                <LabeledValue
                  label="Admin ID"
                  value={profile?.id != null ? String(profile.id) : "—"}
                  mono
                />
              </div>
            </ProfileCardSection>
            <ProfileCardSection divider>
              <p className="text-xs text-muted-foreground">
                Profile editing and password changes for admin accounts are
                managed by the platform team.
              </p>
            </ProfileCardSection>
          </ProfileCard>
        </div>
      )}
    </div>
  );
}
