"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { CIAuthProvider, useCIAuth } from "@/context/ci-auth-context";
import { NotificationProvider } from "@/context/notification-context";
import { logoutCI } from "@/services/ci-auth.service";
import { PortalShell } from "@/components/layout/portal-shell";
import { PortalSidebarBanner } from "@/components/layout/portal-sidebar";
import { CI_NAV, CI_ONBOARDING_NAV } from "@/lib/navigation/nav-config";
import { PageSkeleton } from "@/components/shared/skeletons";

const UNLOCKED_PATHS = ["/ci/agreement"];

function CIShell({ children }: { children: React.ReactNode }) {
  const { user, loading, agreementPhase, clear } = useCIAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // The CI login page lives outside this layout at /ci-login (lightweight
      // (auth) group) so visiting it never mounts this shell.
      router.replace("/ci-login");
      return;
    }
    if (
      user &&
      agreementPhase !== "SIGNED" &&
      agreementPhase !== null &&
      !UNLOCKED_PATHS.includes(pathname)
    ) {
      router.replace("/ci/agreement");
    }
  }, [user, loading, agreementPhase, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) return null;

  // Agreement page gets a minimal shell (header + sign-out) until both
  // parties have signed. No default actions cluster: the notification bell
  // only mounts for signed-in CIs on the full shell below.
  if (pathname === "/ci/agreement" && agreementPhase !== "SIGNED") {
    const handleLogout = async () => {
      await logoutCI().catch(() => {});
      clear();
      router.replace("/ci-login");
    };
    return (
      <PortalShell
        variant="header-only"
        portal="ci"
        homeHref="/ci/agreement"
        brand={{ title: "IPA Portal — CI" }}
        breadcrumbRoot={{ label: "My Agreement", href: "/ci/agreement" }}
        hideDefaultActions
        headerEnd={
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        }
      >
        {children}
      </PortalShell>
    );
  }

  const signed = agreementPhase === "SIGNED";
  const ciHomeHref = signed ? "/ci/dashboard" : "/ci/agreement";

  const shell = (
    <PortalShell
      variant="full"
      portal="ci"
      homeHref={ciHomeHref}
      brand={{ title: "CI Portal", subtitle: user?.instructorCode }}
      nav={signed ? CI_NAV : CI_ONBOARDING_NAV}
      breadcrumbRoot={{ label: "CI Portal", href: ciHomeHref }}
      sidebarBanner={
        !signed ? (
          <PortalSidebarBanner
            icon={<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />}
            title="Signature Required"
          >
            Please sign your course instructor agreement to access the portal.
          </PortalSidebarBanner>
        ) : undefined
      }
    >
      {children}
    </PortalShell>
  );

  // Signed-in CIs get a CI-scoped notification feed (GET /ci/notification +
  // SSE stream). The nested provider shadows the app-level one, so the bell
  // rendered by the shell header talks to the CI endpoints.
  if (user && signed) {
    return (
      <NotificationProvider identity={{ userId: user.id, userType: "ci" }}>
        {shell}
      </NotificationProvider>
    );
  }

  return shell;
}

export default function CILayout({ children }: { children: React.ReactNode }) {
  return (
    <CIAuthProvider>
      <CIShell>{children}</CIShell>
    </CIAuthProvider>
  );
}
