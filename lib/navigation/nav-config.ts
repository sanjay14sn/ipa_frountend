import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Upload,
  Users,
  Trophy,
} from "lucide-react";

/**
 * Frozen navigation constants for all three portals.
 *
 * One active-matching rule app-wide (isNavItemActive): `match: "exact"` items
 * activate only on an exact pathname match; everything else uses prefix
 * matching with a `/` boundary so /admin/operations never false-matches
 * /admin/regional-operations.
 *
 * These constants mirror the CURRENT IA. IA changes (folding CI Agreements
 * into the course-instructors hub, collapsing CI training to one item) ship
 * with their feature phases so nothing is ever unreachable in between.
 */

export interface PortalNavChildItem {
  title: string;
  href: string;
  /** "exact": active only on pathname === href. Default: prefix matching. */
  match?: "exact" | "prefix";
}

export interface PortalNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** "exact": active only on pathname === href. Default: prefix matching. */
  match?: "exact" | "prefix";
  /** Optional nested destinations rendered as an expandable sidebar group. */
  children?: readonly PortalNavChildItem[];
}

export interface PortalNavSection {
  title: string;
  items: PortalNavItem[];
}

function freezeNav(sections: PortalNavSection[]): readonly PortalNavSection[] {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.children) {
        for (const child of item.children) Object.freeze(child);
        Object.freeze(item.children);
      }
      Object.freeze(item);
    }
    Object.freeze(section.items);
    Object.freeze(section);
  }
  return Object.freeze(sections);
}

function isNavHrefActive(
  pathname: string,
  href: string,
  match?: "exact" | "prefix",
): boolean {
  const base = href.split("?")[0];
  if (match === "exact") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isNavChildActive(
  pathname: string,
  child: PortalNavChildItem,
): boolean {
  return isNavHrefActive(pathname, child.href, child.match);
}

export function isNavGroupExpanded(
  pathname: string,
  item: PortalNavItem,
): boolean {
  if (!item.children?.length) return false;
  return (
    isNavHrefActive(pathname, item.href, "prefix") ||
    item.children.some((child) => isNavChildActive(pathname, child))
  );
}

export function isNavItemActive(pathname: string, item: PortalNavItem): boolean {
  if (item.children?.length) {
    return isNavGroupExpanded(pathname, item);
  }
  return isNavHrefActive(pathname, item.href, item.match);
}

export const ADMIN_NAV = freezeNav([
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Franchise", href: "/admin/franchise", icon: Building2 },
      { title: "Students", href: "/admin/students", icon: Users },
      {
        title: "Competitions",
        href: "/admin/competitions",
        icon: Trophy,
        children: [
          {
            title: "All competitions",
            href: "/admin/competitions",
            match: "exact",
          },
          { title: "Mapping", href: "/admin/competitions/mapping" },
          { title: "Practice paper", href: "/admin/competitions/practice-paper" },
          { title: "Certifications", href: "/admin/competitions/certifications" },
          { title: "Practice pricing", href: "/admin/competitions/practice-pricing" },
        ],
      },
      {
        // ADM-18: CI agreements live inside this hub's `agreements` tab now.
        title: "Course Instructors",
        href: "/admin/course-instructors",
        icon: GraduationCap,
      },
      { title: "Operations", href: "/admin/operations", icon: ShoppingCart },
      { title: "Bulk Import", href: "/admin/bulk-import", icon: Upload },
    ],
  },
]);

/**
 * Super-admin nav, composed from ADMIN_NAV: Overview gains Programs + Admins,
 * Management drops Operations, and a dedicated Operations group (HQ/Regional)
 * is appended.
 */
export const SUPER_ADMIN_NAV = freezeNav([
  {
    title: "Overview",
    items: [...ADMIN_NAV[0].items],
  },
  {
    title: "Management",
    items: ADMIN_NAV[1].items.filter(
      (item) => item.href !== "/admin/operations",
    ),
  },
  {
    title: "Operations",
    items: [
      { title: "HQ", href: "/admin/operations", icon: ShoppingCart },
      { title: "Regional", href: "/admin/regional-operations", icon: Globe },
    ],
  },
  {
    // ADM-28: the two super-only configuration destinations get their own
    // group instead of crowding Overview.
    title: "Configuration",
    items: [
      {
        // ADM-27: training levels live here too — the label says so.
        title: "Programs & Levels",
        href: "/admin/programs",
        icon: BookOpen,
        match: "exact",
      },
      {
        title: "LMS",
        href: "/admin/learning/book-master",
        icon: ClipboardList,
        children: [
          {
            title: "Book Master",
            href: "/admin/learning/book-master",
            match: "exact",
          },
          { title: "Student Progress", href: "/admin/learning/progress" },
        ],
      },
      { title: "Admins", href: "/admin/admins", icon: ShieldCheck },
    ],
  },
]);

export const FRANCHISEE_NAV = freezeNav([
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/franchisee/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    title: "My business",
    items: [
      { title: "Students", href: "/franchisee/students", icon: Users },
      { title: "Fees", href: "/franchisee/fees", icon: Receipt },
      {
        title: "Competitions",
        href: "/franchisee/competitions",
        icon: Trophy,
        children: [
          {
            title: "Active competitions",
            href: "/franchisee/competitions",
            match: "exact",
          },
          { title: "Certifications", href: "/franchisee/competitions/certifications" },
        ],
      },
      {
        title: "Course Instructors",
        href: "/franchisee/course-instructors",
        icon: GraduationCap,
      },
      { title: "Orders", href: "/franchisee/orders", icon: ShoppingCart },
    ],
  },
  {
    title: "Learning",
    items: [
      {
        title: "Assignments",
        href: "/franchisee/learning/assignments",
        icon: ClipboardList,
      },
      { title: "Batches", href: "/franchisee/learning/batches", icon: Users },
      {
        title: "Student Progress",
        href: "/franchisee/learning/progress",
        icon: BookOpen,
      },
    ],
  },
]);

export const FRANCHISEE_ONBOARDING_NAV = freezeNav([
  {
    title: "Setup",
    items: [
      {
        title: "Franchise Agreement",
        href: "/franchisee/agreement",
        icon: FileText,
      },
    ],
  },
]);

export const CI_NAV = freezeNav([
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/ci/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    title: "Agreement",
    items: [{ title: "My Agreement", href: "/ci/agreement", icon: FileText }],
  },
  {
    // CI-04: the three training routes collapsed into the /ci/training hub
    // (prefix match keeps Training active on every ?tab=).
    title: "Training",
    items: [
      { title: "Training", href: "/ci/training", icon: GraduationCap },
    ],
  },
]);

export const CI_ONBOARDING_NAV = freezeNav([
  {
    title: "Setup",
    items: [{ title: "My Agreement", href: "/ci/agreement", icon: FileText }],
  },
]);

export function getAdminNav(
  role: "super" | "staff" | string | null | undefined,
): readonly PortalNavSection[] {
  return role === "super" ? SUPER_ADMIN_NAV : ADMIN_NAV;
}
