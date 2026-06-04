"use client";

import type React from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DynamicSidebar } from "@/components/dynamic-sidebar";
import {
  SidebarInset,
  SidebarProvider,
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
import { FranchiseSwitcher } from "@/components/franchisee/franchise-switcher";
import { AgreementSwitcher } from "@/components/franchisee/agreement-switcher";
import { useUser } from "@/context/user-context";
import { isFranchiseOperational } from "@/lib/auth";

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
  const isPreActiveFranchisee =
    user?.role === "franchisee" && !isFranchiseOperational(user);

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
    return <div className="min-h-screen bg-surface" />;
  }

  if (!user || user.role !== "franchisee") return null;

  if (isPreActiveFranchisee && !isOnAgreementPage) {
    return <div className="min-h-screen bg-surface" />;
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
      <div className="min-h-screen bg-surface">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-brand-white-200/50 px-4">
          <div className="flex items-center gap-2">
            <FranchiseSwitcher fallbackLabel="Franchise Setup" />
            <AgreementSwitcher />
          </div>
          <PortalHeaderActions />
        </header>
        {children}
      </div>
    );
  }

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
                  href="/franchisee/dashboard"
                  className="text-primary hover:text-primary hover:underline"
                >
                  Franchise Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <FranchiseSwitcher />
            <AgreementSwitcher />
          </div>
          <PortalHeaderActions />
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-background p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
