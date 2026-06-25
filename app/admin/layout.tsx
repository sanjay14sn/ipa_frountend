"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useUser } from "@/context/user-context";
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Regional (staff) admins are confined to a single Operations page.
  // Gate on === "staff" (never !== "super") so an unhydrated adminRole never
  // misclassifies a super admin.
  const isRegionalAdmin =
    user?.role === "admin" && user.adminRole === "staff";

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/admin-login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading) return;
    if (isRegionalAdmin && !pathname.startsWith("/admin/operations")) {
      router.replace("/admin/operations");
    }
  }, [loading, isRegionalAdmin, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  // Regional admins: no sidebar, just the Operations page. Render nothing while
  // a non-operations path is being redirected away to avoid a flash.
  if (isRegionalAdmin) {
    if (!pathname.startsWith("/admin/operations")) return null;
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-brand-white-200/50 px-4">
          <span className="font-semibold text-primary">Abacus Operations</span>
          <PortalHeaderActions />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
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
                  href="/admin/dashboard"
                  className="text-primary hover:text-primary hover:underline"
                >
                  Admin Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <PortalHeaderActions />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 bg-background">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
