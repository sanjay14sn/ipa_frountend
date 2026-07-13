"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useUser } from "@/context/user-context";
import { PortalShell } from "@/components/layout/portal-shell";
import { getAdminNav } from "@/lib/navigation/nav-config";
import { PageSkeleton } from "@/components/shared/skeletons";

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
      <div className="min-h-screen bg-background p-4">
        <PageSkeleton />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  // Regional admins: no sidebar, just the Operations page. Render nothing while
  // a non-operations path is being redirected away to avoid a flash.
  if (isRegionalAdmin) {
    if (!pathname.startsWith("/admin/operations")) return null;
    return (
      <PortalShell
        variant="header-only"
        portal="admin"
        homeHref="/admin/operations"
        brand={{ title: "IPA Operations" }}
        breadcrumbRoot={{ label: "Operations", href: "/admin/operations" }}
      >
        {children}
      </PortalShell>
    );
  }

  return (
    <PortalShell
      variant="full"
      portal="admin"
      homeHref="/admin/dashboard"
      brand={{
        title: "IPA Portal",
        subtitle: user.adminRole === "super" ? "Super Admin" : "Admin",
      }}
      nav={getAdminNav(user.adminRole)}
      breadcrumbRoot={{ label: "Dashboard", href: "/admin/dashboard" }}
    >
      {children}
    </PortalShell>
  );
}
