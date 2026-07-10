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
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Upload,
  Users,
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

export interface PortalNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** "exact": active only on pathname === href. Default: prefix matching. */
  match?: "exact" | "prefix";
}

export interface PortalNavSection {
  title: string;
  items: PortalNavItem[];
}

function freezeNav(sections: PortalNavSection[]): readonly PortalNavSection[] {
  for (const section of sections) {
    for (const item of section.items) Object.freeze(item);
    Object.freeze(section.items);
    Object.freeze(section);
  }
  return Object.freeze(sections);
}

export function isNavItemActive(pathname: string, item: PortalNavItem): boolean {
  const href = item.href.split("?")[0];
  if (item.match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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
        title: "Course Instructors",
        href: "/admin/course-instructors",
        icon: GraduationCap,
      },
      { title: "CI Agreements", href: "/admin/ci-agreements", icon: ScrollText },
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
    items: [
      ...ADMIN_NAV[0].items,
      {
        title: "Programs",
        href: "/admin/programs",
        icon: BookOpen,
        match: "exact",
      },
      { title: "Admins", href: "/admin/admins", icon: ShieldCheck },
    ],
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
      { title: "My Franchise", href: "/franchisee/franchise", icon: Store },
      { title: "Students", href: "/franchisee/students", icon: Users },
      {
        title: "Course Instructors",
        href: "/franchisee/course-instructors",
        icon: GraduationCap,
      },
      { title: "Orders", href: "/franchisee/orders", icon: ShoppingCart },
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
