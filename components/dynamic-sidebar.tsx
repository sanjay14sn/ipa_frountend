"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import {
  Calculator,
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Users,
  GraduationCap,
  Trophy,
  FileText,
  Settings,
  LogOut,
  Store,
  Clock,
  AlertCircle,
  IndianRupee,
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
import { User, getUserFromStorage, removeUserFromStorage } from "@/lib/auth";

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
          title: "Pending Approvals",
          url: "/admin/pending-approvals",
          icon: Clock,
        },
        {
          title: "Pricing Management",
          url: "/admin/pricing-management",
          icon: IndianRupee,
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
  }, []);

  const handleLogout = () => {
    removeUserFromStorage();
    window.location.href = "/login";
  };

  // Determine navigation based on user role and onboarding status
  let navigation = adminNavigation;
  let sidebarTitle = "Abacus Admin";
  let sidebarSubtitle = "Admin Dashboard";

  if (user?.role === "franchise") {
    // Check if franchisee has completed onboarding
    if (user.onboardingCompleted) {
      navigation = franchiseNavigation;
      sidebarTitle = "Franchise Portal";
      sidebarSubtitle = user?.franchiseName || "Franchise Dashboard";
    } else {
      // Show limited navigation for incomplete onboarding
      navigation = onboardingNavigation;
      sidebarTitle = "Franchise Setup";
      sidebarSubtitle = "Complete your agreement";
    }
  }

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
                    : user?.onboardingCompleted
                    ? "/franchisee/dashboard"
                    : "/franchisee/agreement"
                }
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  {user?.role === "admin" ? (
                    <Calculator className="size-4" />
                  ) : user?.onboardingCompleted ? (
                    <Store className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{sidebarTitle}</span>
                  <span className="truncate text-xs">{sidebarSubtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Onboarding Alert for incomplete franchisees */}
      {user?.role === "franchise" && !user?.onboardingCompleted && (
        <div className="px-3 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-amber-800">Setup Required</p>
                <p className="text-amber-700 mt-1">
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
                user?.role === "franchise" && !user?.onboardingCompleted
                  ? "text-amber-700 font-medium"
                  : ""
              }
            >
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
