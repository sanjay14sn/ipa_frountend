"use client";

import type React from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { PortalShell } from "@/components/layout/portal-shell";
import { PortalSidebarBanner } from "@/components/layout/portal-sidebar";
import { FranchiseSwitcher } from "@/components/franchisee/franchise-switcher";
import { AgreementSwitcher } from "@/components/franchisee/agreement-switcher";
import { useUser } from "@/context/user-context";
import {
  getEffectiveFranchiseStatus,
  isFranchiseOperational,
} from "@/lib/auth";
import {
  FRANCHISEE_NAV,
  FRANCHISEE_ONBOARDING_NAV,
} from "@/lib/navigation/nav-config";
import { PageSkeleton } from "@/components/shared/skeletons";

export default function FranchiseeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useUser();
  const pathname = usePathname();
  const isOnAgreementPage =
    pathname === "/franchisee/agreement" ||
    (pathname?.startsWith("/franchisee/agreement/") ?? false);
  // "Operational" is derived from agreements now (>=1 valid agreement); a
  // franchisee with no valid agreement is funnelled to the agreement page.
  const isActiveFranchisee = isFranchiseOperational(user);
  const isPreActiveFranchisee =
    user?.role === "franchisee" && !isActiveFranchisee;
  const isApprovedFranchisee =
    getEffectiveFranchiseStatus(user) === "Approved";

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "franchisee") {
      router.replace("/login");
      return;
    }
    // Pre-active franchisees (no Valid franchise agreement yet) get forced onto
    // the agreement page. Active franchisees roam freely; the agreement page
    // itself handles redirect-away when the specific agreement is already Valid.
    if (isPreActiveFranchisee && !isOnAgreementPage) {
      router.replace("/franchisee/agreement");
    }
  }, [user, loading, isOnAgreementPage, isPreActiveFranchisee, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageSkeleton />
      </div>
    );
  }

  if (!user || user.role !== "franchisee") return null;

  if (isPreActiveFranchisee && !isOnAgreementPage) {
    return <div className="min-h-screen bg-background" />;
  }

  // Header-only shell for ANY /franchisee/agreement* visit. The agreement page
  // itself decides whether the user should actually see the sign form
  // (redirects away if the specific agreement is already Valid/Suspended/Void).
  // This keeps the signing experience focused regardless of franchise status.
  //
  // The header still surfaces BOTH the franchise switcher AND the agreement
  // (program) switcher so an active franchisee with multiple programs in
  // various stages can move between them without leaving the sign page.
  if (isOnAgreementPage) {
    return (
      <PortalShell
        variant="header-only"
        portal="franchisee"
        homeHref="/franchisee/agreement"
        brand={{ title: "IPA Portal" }}
        breadcrumbRoot={{ label: "Agreement", href: "/franchisee/agreement" }}
        headerStart={
          <div className="flex items-center gap-2">
            <FranchiseSwitcher fallbackLabel="Franchise Setup" />
            <AgreementSwitcher />
          </div>
        }
      >
        {children}
      </PortalShell>
    );
  }

  return (
    <PortalShell
      variant="full"
      portal="franchisee"
      homeHref={
        isActiveFranchisee ? "/franchisee/dashboard" : "/franchisee/agreement"
      }
      brand={
        isActiveFranchisee
          ? {
              title: "Franchise Portal",
              subtitle: user.franchiseName || "Franchise Dashboard",
            }
          : {
              title: "Franchise Setup",
              subtitle: isApprovedFranchisee
                ? "Sign and pay to activate"
                : "Awaiting admin approval",
            }
      }
      nav={isActiveFranchisee ? FRANCHISEE_NAV : FRANCHISEE_ONBOARDING_NAV}
      breadcrumbRoot={{ label: "Dashboard", href: "/franchisee/dashboard" }}
      headerStart={
        <div className="flex items-center gap-2">
          <FranchiseSwitcher />
          <AgreementSwitcher />
        </div>
      }
      sidebarBanner={
        isPreActiveFranchisee ? (
          <PortalSidebarBanner
            icon={<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />}
            title="Setup Required"
          >
            {isApprovedFranchisee
              ? "Sign your agreement and complete payment to activate your franchise."
              : "Your application is waiting for admin approval. Portal access will unlock after approval."}
          </PortalSidebarBanner>
        ) : undefined
      }
    >
      {children}
    </PortalShell>
  );
}
