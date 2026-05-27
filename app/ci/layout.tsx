"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CIAuthProvider, useCIAuth } from "@/context/ci-auth-context";
import { logoutCI } from "@/services/ci-auth.service";
import { DynamicSidebar } from "@/components/dynamic-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { PortalHeaderActions } from "@/components/layout/portal-header-actions";

const UNLOCKED_PATHS = ["/ci/login", "/ci/agreement", "/ci/change-password"];

function CIShell({ children }: { children: React.ReactNode }) {
  const { user, loading, agreementPhase, clear } = useCIAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/ci/login") {
      router.replace("/ci/login");
      return;
    }
    if (user?.mustChangePassword && pathname !== "/ci/change-password") {
      router.replace("/ci/change-password");
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user && pathname !== "/ci/login") return null;

  // Login and change-password pages render without sidebar
  if (pathname === "/ci/login" || pathname === "/ci/change-password") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Agreement page gets a minimal shell (header + logout) until both parties have signed.
  if (pathname === "/ci/agreement" && agreementPhase !== "SIGNED") {
    const handleLogout = async () => {
      await logoutCI().catch(() => {});
      clear();
      router.replace("/ci/login");
    };
    return (
      <div className="min-h-screen bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            Abacus Academy — CI Portal
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </header>
        {children}
      </div>
    );
  }

  const ciHomeHref =
    agreementPhase === "SIGNED" ? "/ci/dashboard" : "/ci/agreement";

  return (
    <SidebarProvider>
      <DynamicSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-brand-white-200/50 px-4">
          <SidebarTrigger className="-ml-1 text-primary hover:bg-accent hover:text-accent-foreground" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={ciHomeHref}
                  className="text-primary hover:text-primary hover:underline"
                >
                  CI Portal
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <PortalHeaderActions />
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-background p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CILayout({ children }: { children: React.ReactNode }) {
  return (
    <CIAuthProvider>
      <CIShell>{children}</CIShell>
    </CIAuthProvider>
  );
}
