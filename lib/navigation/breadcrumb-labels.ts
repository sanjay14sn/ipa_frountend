/**
 * Breadcrumb label maps. Resolution order per segment:
 * dynamic override (breadcrumb-store) > SEGMENT_LABELS > humanizeSegment.
 */

/** Static path segments → display labels. */
export const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  ci: "CI",
  franchisee: "Franchisee",
  dashboard: "Dashboard",
  franchise: "Franchise",
  students: "Students",
  "course-instructors": "Course Instructors",
  "ci-agreements": "CI Agreements",
  operations: "Operations",
  "regional-operations": "Regional Operations",
  "bulk-import": "Bulk Import",
  programs: "Programs",
  admins: "Admins",
  profile: "Profile",
  agreement: "Agreement",
  agreements: "Agreements",
  orders: "Orders",
  training: "Training",
  receivables: "Receivables",
  progress: "Progress",
  upcoming: "Upcoming",
  "practice-papers": "Practice Papers",
  "practice-pricing": "Practice Pricing",
};

/** Hub pathname → ?tab= value → label. */
export const TAB_LABELS: Record<string, Record<string, string>> = {
  "/admin/franchise": {
    franchises: "Franchises",
    applications: "Applications",
    programs: "Program Requests",
    agreements: "Agreements",
  },
  "/admin/students": {
    ids: "ID Requests",
    certificates: "Certificates",
    lifecycle: "Lifecycle",
  },
  "/admin/course-instructors": {
    applications: "Applications",
    active: "Active",
    training: "Training",
  },
  "/admin/operations": {
    orders: "Orders",
    shipping: "Shipping",
    payments: "Payments",
    inventory: "Inventory",
    procurement: "Procurement",
    monitoring: "Monitoring",
  },
  "/admin/regional-operations": {
    orders: "Orders",
    shipping: "Shipping",
    payments: "Payments",
    inventory: "Inventory",
    monitoring: "Monitoring",
  },
  "/franchisee/students": {
    manage: "Manage",
    certificates: "Certificates",
  },
};

/**
 * Tab labels for dynamic-segment hubs, keyed by a pattern where dynamic
 * segments are `*`. Checked when no literal TAB_LABELS key matches.
 */
export const DYNAMIC_TAB_LABELS: Record<string, Record<string, string>> = {
  "/admin/franchise/*": {
    students: "Students",
    ci: "Course Instructors",
    orders: "Orders",
    payments: "Payments",
    agreements: "Agreements",
  },
};

/** kebab-case → Title Case fallback for unmapped segments. */
export function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/** Resolve the tab-label map for a pathname (literal first, then patterns). */
export function getTabLabels(
  pathname: string,
): Record<string, string> | undefined {
  if (TAB_LABELS[pathname]) return TAB_LABELS[pathname];
  for (const [pattern, labels] of Object.entries(DYNAMIC_TAB_LABELS)) {
    const patternParts = pattern.split("/");
    const pathParts = pathname.split("/");
    if (patternParts.length !== pathParts.length) continue;
    const matches = patternParts.every(
      (part, i) => part === "*" || part === pathParts[i],
    );
    if (matches) return labels;
  }
  return undefined;
}
