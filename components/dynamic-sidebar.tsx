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

  const navigation =
    user?.role === "admin" ? adminNavigation : franchiseNavigation;
  const sidebarTitle =
    user?.role === "admin" ? "Abacus Admin" : "Franchise Portal";
  const sidebarSubtitle =
    user?.role === "admin"
      ? "Admin Dashboard"
      : user?.franchiseName || "Franchise Dashboard";

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
                    : "/franchisee/dashboard"
                }
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  {user?.role === "admin" ? (
                    <Calculator className="size-4" />
                  ) : (
                    <Store className="size-4" />
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
      <SidebarContent>
        {navigation.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
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
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
