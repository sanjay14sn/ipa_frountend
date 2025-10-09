"use client";

import type * as React from "react";
import {
  Calculator,
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Users,
  GraduationCap,
  Trophy,
  FileText,
  LogOut,
  Store,
  Clock,
  AlertCircle,
  BookOpen,
  Award,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { franchiseeLogout, logout } from "@/services/auth.service";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

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
      title: "Franchise Management",
      items: [
        {
          title: "Manage Franchises",
          url: "/admin/franchises",
          icon: Building2,
        },
        {
          title: "Franchisee Approvals",
          url: "/admin/pending-approvals",
          icon: Clock,
        },
        {
          title: "CI Approvals",
          url: "/admin/course-instructor-approvals",
          icon: GraduationCap,
        },
        {
          title: "ID Requests",
          url: "/admin/id-requests",
          icon: Users,
        },
        {
          title: "Certificate Requests",
          url: "/admin/certificate-requests",
          icon: Award,
        },
        {
          title: "CI Training",
          url: "/admin/ci-training",
          icon: BookOpen,
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
      title: "My Franchise",
      items: [
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
        {
          title: "Contests",
          url: "/franchisee/contests",
          icon: Trophy,
        },
        {
          title: "Certificate Requests",
          url: "/franchisee/certificate-requests",
          icon: Award,
        },
      ],
    },
  ],
};

// Navigation for franchisees who haven't completed onboarding
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

export function DynamicSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Determine navigation based on user role and onboarding status
  let navigation = adminNavigation;
  let sidebarTitle = "Abacus Admin";
  let sidebarSubtitle = "Admin Dashboard";

  if (user?.role === "franchisee") {
    if (user.franchiseStatus === "Active") {
      navigation = franchiseNavigation;
      sidebarTitle = "Franchise Portal";
      sidebarSubtitle = user?.franchiseName || "Franchise Dashboard";
    } else {
      navigation = onboardingNavigation;
      sidebarTitle = "Franchise Setup";
      sidebarSubtitle = "Complete your agreement";
    }
  }

  // Helper function to check if a menu item is active
  const isActive = (url: string) => {
    return pathname === url;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href={
                  user?.role === "admin"
                    ? "/admin/dashboard"
                    : user?.franchiseStatus === "Active"
                    ? "/franchisee/dashboard"
                    : "/franchisee/agreement"
                }
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-yellow-400 text-brand-green-500 shadow-md">
                  {user?.role === "admin" ? (
                    <Calculator className="size-4" />
                  ) : user?.franchiseStatus === "Active" ? (
                    <Store className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
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

      {/* Onboarding Alert for incomplete franchisees */}
      {user?.role === "franchisee" && user?.franchiseStatus === "Pending" && (
        <div className="px-3 py-2">
          <div className="bg-brand-yellow-50 border border-brand-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-brand-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-brand-yellow-800">
                  Setup Required
                </p>
                <p className="text-brand-yellow-700 mt-1">
                  Complete your franchise agreement to access all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <SidebarContent>
        {navigation.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel
              className={
                user?.role === "franchisee" &&
                user?.franchiseStatus === "Pending"
                  ? "text-brand-yellow-400 font-medium"
                  : "text-sidebar-foreground/80 font-medium"
              }
            >
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={`transition-colors ${
                          active
                            ? "!bg-primary !text-white hover:!bg-brand-green-600 data-[active=true]:!bg-primary data-[active=true]:!text-white"
                            : "text-sidebar-foreground hover:bg-secondary/50 hover:text-brand-green-500"
                        }`}
                      >
                        <Link href={item.url}>
                          <item.icon
                            className={
                              active
                                ? "!text-secondary"
                                : "text-brand-green-500"
                            }
                          />
                          <span>{item.title}</span>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                if (user?.role === "admin") {
                  logout();
                  router.push("/admin-login");
                } else {
                  franchiseeLogout();
                  router.push("/login");
                }
              }}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-brand-green-500 transition-colors"
            >
              <LogOut className="text-brand-green-500" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
