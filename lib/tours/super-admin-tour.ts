import {
  freezeTour,
  navAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/** Copy source of truth: docs/guided-tours/steps-super-admin.md */
export const SUPER_ADMIN_TOUR = freezeTour({
  key: "super-admin-dashboard",
  version: 1,
  page: "/admin/dashboard",
  readyWhen: testIdAnchor("stat-cell"),
  steps: [
    {
      anchor: null,
      title: "Welcome to the IPA Admin Portal",
      body: "This 2-minute tour shows you where everything lives. Use Next and Back to move through it — you can skip anytime and replay it later from the ? button in the header.",
    },
    {
      anchor: navAnchor("/admin/dashboard"),
      title: "Dashboard",
      body: "Your home base — network-wide stats and shortcuts to the most common tasks. You're looking at it now.",
    },
    {
      anchor: widgetAnchor("dashboard-stats"),
      title: "Network at a glance",
      body: "Live totals for franchises, students, course instructors, orders and certificates. Amber chips mark items waiting for action — click one to jump straight to that queue.",
    },
    {
      anchor: widgetAnchor("dashboard-quick-access"),
      title: "Quick access panels",
      body: "Each panel groups shortcuts for one area — franchises, training, orders & payments, operations — with recent applications and orders alongside.",
    },
    {
      anchor: navAnchor("/admin/franchise"),
      title: "Franchise Hub",
      body: "Everything about franchises: live records, new applications to approve, program requests, and franchise agreements.",
    },
    {
      anchor: navAnchor("/admin/students"),
      title: "Students",
      body: "The student roster across all franchises, plus lifecycle management, ID card requests and certificate requests.",
    },
    {
      anchor: navAnchor("/admin/course-instructors"),
      title: "Course Instructors",
      body: "CI applications to review, active CIs, training sessions and CI agreements — each in its own tab.",
    },
    {
      anchor: navAnchor("/admin/bulk-import"),
      title: "Bulk Import",
      body: "Bring in many records at once from spreadsheets instead of creating them one by one.",
    },
    {
      anchor: navAnchor("/admin/operations"),
      title: "HQ Operations",
      body: "The HQ workspace: verify orders, dispatch shipping, record payments, manage inventory and procurement.",
    },
    {
      anchor: navAnchor("/admin/regional-operations"),
      title: "Regional Operations",
      body: "Oversight across every region — orders, shipping, payments and inventory, all regions in one place.",
    },
    {
      anchor: navAnchor("/admin/programs"),
      title: "Programs & Levels",
      body: "Configure the programs you offer and their training levels. Only superadmins see this.",
    },
    {
      anchor: navAnchor("/admin/admins"),
      title: "Admins",
      body: "Create and manage admin accounts, including regional admins.",
    },
    {
      anchor: widgetAnchor("header-notifications"),
      title: "Notifications",
      body: "Real-time alerts land here — new applications, orders, payments and requests.",
    },
    {
      anchor: widgetAnchor("header-profile"),
      title: "Your profile",
      body: "Profile & settings and logout live here. That's the tour — replay it anytime with the ? button right beside this menu.",
    },
  ],
});
