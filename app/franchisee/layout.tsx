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
import { useUser } from "@/context/user-context";
import { getEffectiveFranchiseStatus } from "@/lib/auth";

export default function FranchiseeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useUser();
  const pathname = usePathname();
  const franchiseStatus = getEffectiveFranchiseStatus(user);
  const isAgreementOnboarding =
    pathname === "/franchisee/agreement" ||
    pathname?.startsWith("/franchisee/agreement/");
  const isPreActiveFranchisee =
    user?.role === "franchisee" && franchiseStatus !== "Active";

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "franchisee") {
      router.replace("/login");
      return;
    }
    if (isPreActiveFranchisee && !isAgreementOnboarding) {
      router.replace("/franchisee/agreement");
    }
  }, [user, loading, isAgreementOnboarding, isPreActiveFranchisee, router]);

  if (loading) {
    return <div className="min-h-screen bg-surface" />;
  }

  if (!user || user.role !== "franchisee") return null;

  if (isPreActiveFranchisee && !isAgreementOnboarding) {
    return <div className="min-h-screen bg-surface" />;
  }

  if (isAgreementOnboarding) {
    return <div className="min-h-screen bg-surface">{children}</div>;
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
                  className="text-primary hover:text-accent"
                >
                  Franchise Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <FranchiseSwitcher />
          <PortalHeaderActions />
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-background p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
