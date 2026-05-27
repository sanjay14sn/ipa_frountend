"use client";

import type * as React from "react";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  Store,
  Upload,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useCIAuth } from "@/context/ci-auth-context";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getEffectiveFranchiseStatus } from "@/lib/auth";

const adminNavigation = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/admin/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Franchise",
          url: "/admin/franchise",
          icon: Building2,
        },
        {
          title: "Students",
          url: "/admin/students",
          icon: Users,
        },
        {
          title: "Course Instructors",
          url: "/admin/course-instructors",
          icon: GraduationCap,
        },
        {
          title: "Operations",
          url: "/admin/operations",
          icon: ShoppingCart,
        },
        {
          title: "Bulk Import",
          url: "/admin/bulk-import",
          icon: Upload,
        },
      ],
    },
  ],
};

const franchiseNavigation = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/franchisee/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "My business",
      items: [
        {
          title: "My Franchise",
          url: "/franchisee/franchise",
          icon: Store,
        },
        {
          title: "Students",
          url: "/franchisee/students",
          icon: Users,
        },
        {
          title: "Course Instructors",
          url: "/franchisee/course-instructors",
          icon: GraduationCap,
        },
        {
          title: "Orders",
          url: "/franchisee/orders",
          icon: ShoppingCart,
        },
      ],
    },
  ],
};

const onboardingNavigation = {
  navMain: [
    {
      title: "Setup",
      items: [
        {
          title: "Franchise Agreement",
          url: "/franchisee/agreement",
          icon: FileText,
        },
      ],
    },
  ],
};

const ciNavigation = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/ci/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Agreement",
      items: [
        {
          title: "My Agreement",
          url: "/ci/agreement",
          icon: FileText,
        },
      ],
    },
    {
      title: "Training",
      items: [
        {
          title: "Packages",
          url: "/ci/training/packages",
          icon: ClipboardList,
        },
        {
          title: "Progress",
          url: "/ci/training/progress",
          icon: GraduationCap,
        },
        {
          title: "Upcoming",
          url: "/ci/training/upcoming",
          icon: Calendar,
        },
      ],
    },
  ],
};

const ciOnboardingNavigation = {
  navMain: [
    {
      title: "Setup",
      items: [
        {
          title: "My Agreement",
          url: "/ci/agreement",
          icon: FileText,
        },
      ],
    },
  ],
};

function isNavItemActive(pathname: string, url: string): boolean {
  const urlPath = url.split("?")[0];
  if (
    urlPath === "/admin/dashboard" ||
    urlPath === "/admin/programs" ||
    urlPath === "/franchisee/dashboard"
  ) {
    return pathname === urlPath;
  }
  if (urlPath === "/admin/franchise") {
    return pathname.startsWith("/admin/franchise");
  }
  if (urlPath === "/franchisee/franchise") {
    return pathname.startsWith("/franchisee/franchise");
  }
  if (urlPath === "/admin/students") {
    return pathname.startsWith("/admin/students");
  }
  if (urlPath === "/franchisee/students") {
    return pathname.startsWith("/franchisee/students");
  }
  if (urlPath === "/admin/course-instructors") {
    return pathname.startsWith("/admin/course-instructors");
  }
  if (urlPath === "/franchisee/course-instructors") {
    return pathname.startsWith("/franchisee/course-instructors");
  }
  if (urlPath === "/admin/operations") {
    return pathname.startsWith("/admin/operations");
  }
  if (urlPath === "/admin/admins") {
    return pathname.startsWith("/admin/admins");
  }
  if (urlPath === "/franchisee/orders") {
    return pathname.startsWith("/franchisee/orders");
  }
  return pathname === urlPath || pathname.startsWith(`${urlPath}/`);
}

export function DynamicSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { user: ciUser, agreementPhase } = useCIAuth();
  const pathname = usePathname();
  const franchiseStatus = getEffectiveFranchiseStatus(user);
  const isActiveFranchisee = franchiseStatus === "Active";
  const isApprovedFranchisee = franchiseStatus === "Approved";

  let navigation = adminNavigation;
  let sidebarTitle = "Abacus Admin";
  let sidebarSubtitle = "Admin Dashboard";

  const isCIUser = !!ciUser && !user;
  const ciAgreementLocked = isCIUser && agreementPhase !== "SIGNED" && agreementPhase !== null;

  if (isCIUser) {
    sidebarTitle = "CI Portal";
    sidebarSubtitle = ciUser.instructorCode;
    navigation = ciAgreementLocked ? ciOnboardingNavigation : ciNavigation;
  } else if (user?.role === "admin" && user.adminRole === "super") {
    navigation = {
      ...adminNavigation,
      navMain: adminNavigation.navMain.map((group) =>
        group.title === "Overview"
          ? {
              ...group,
              items: [
                ...group.items,
                {
                  title: "Programs",
                  url: "/admin/programs",
                  icon: BookOpen,
                },
                {
                  title: "Admins",
                  url: "/admin/admins",
                  icon: ShieldCheck,
                },
              ],
            }
          : group,
      ),
    };
  } else if (user?.role === "franchisee") {
    if (isActiveFranchisee) {
      navigation = franchiseNavigation;
      sidebarTitle = "Franchise Portal";
      sidebarSubtitle = user?.franchiseName || "Franchise Dashboard";
    } else {
      navigation = onboardingNavigation;
      sidebarTitle = "Franchise Setup";
      sidebarSubtitle =
        isApprovedFranchisee
          ? "Sign and pay to activate"
          : "Awaiting admin approval";
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-1 p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href={
                  isCIUser
                    ? ciAgreementLocked
                      ? "/ci/agreement"
                      : "/ci/dashboard"
                    : user?.role === "admin"
                      ? "/admin/dashboard"
                      : isActiveFranchisee
                        ? "/franchisee/dashboard"
                        : "/franchisee/agreement"
                }
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/12 text-primary shadow-sm ring-1 ring-primary/10">
                  {isCIUser ? (
                    <GraduationCap className="size-4" />
                  ) : user?.role === "admin" ? (
                    <Calculator className="size-4" />
                  ) : isActiveFranchisee ? (
                    <Store className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    {sidebarTitle}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {sidebarSubtitle}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {user?.role === "franchisee" && !isActiveFranchisee && (
        <div className="border-t border-sidebar-border px-2 py-1.5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-xs">
                <p className="font-medium text-primary">Setup Required</p>
                <p className="mt-1 text-foreground/80">
                  {isApprovedFranchisee
                    ? "Sign your agreement and complete payment to activate your franchise."
                    : "Your application is waiting for admin approval. Portal access will unlock after approval."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCIUser && ciAgreementLocked && (
        <div className="border-t border-sidebar-border px-2 py-1.5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-xs">
                <p className="font-medium text-primary">Signature Required</p>
                <p className="mt-1 text-foreground/80">
                  Please sign your course instructor agreement to access the portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="gap-0">
        {navigation.navMain.map((group, index) => (
          <SidebarGroup
            key={group.title}
            className={cn("px-2 py-1", index === 0 ? "pt-1.5" : "pt-0")}
          >
            <SidebarGroupLabel
              className={cn(
                "h-7 px-2 text-[11px] font-semibold uppercase tracking-wider text-primary/65",
                ((user?.role === "franchisee" && !isActiveFranchisee) ||
                  (isCIUser && ciAgreementLocked)) &&
                  "text-primary/80",
              )}
            >
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((navItem) => {
                  const active = isNavItemActive(pathname, navItem.url);
                  return (
                    <SidebarMenuItem key={navItem.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "transition-colors",
                          active
                            ? "!bg-primary !text-primary-foreground hover:!bg-primary/90 data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary",
                        )}
                      >
                        <Link href={navItem.url} aria-current={active ? "page" : undefined}>
                          <navItem.icon
                            className={cn(
                              "shrink-0",
                              active
                                ? "!text-primary-foreground"
                                : "text-primary",
                            )}
                          />
                          <span>{navItem.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
