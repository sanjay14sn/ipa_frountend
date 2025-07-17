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
  Settings,
  LogOut,
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

const data = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Franchise Management",
      items: [
        {
          title: "All Franchises",
          url: "/dashboard/franchises",
          icon: Building2,
        },
        {
          title: "Students",
          url: "/dashboard/students",
          icon: Users,
        },
        {
          title: "Course Instructors",
          url: "/dashboard/course-instructors",
          icon: GraduationCap,
        },
      ],
    },
    {
      title: "Orders & Materials",
      items: [
        {
          title: "All Orders",
          url: "/dashboard/orders",
          icon: ShoppingCart,
        },
        {
          title: "Materials",
          url: "/dashboard/orders/materials",
          icon: FileText,
        },
        {
          title: "Certificates",
          url: "/dashboard/orders/certificates",
          icon: Trophy,
        },
      ],
    },
    {
      title: "Exams & Contests",
      items: [
        {
          title: "Contests",
          url: "/dashboard/contests",
          icon: Trophy,
        },
        {
          title: "Grading Exams",
          url: "/dashboard/exams",
          icon: FileText,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Calculator className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Abacus Admin</span>
                  <span className="truncate text-xs">Franchise Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
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
            <SidebarMenuButton asChild>
              <Link href="/login">
                <LogOut />
                <span>Logout</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
