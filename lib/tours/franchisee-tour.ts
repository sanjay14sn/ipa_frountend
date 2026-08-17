import {
  freezeTour,
  navAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/** Copy source of truth: docs/guided-tours/steps-franchisee.md */
export const FRANCHISEE_TOUR = freezeTour({
  key: "franchisee-dashboard",
  version: 1,
  page: "/franchisee/dashboard",
  readyWhen: testIdAnchor("stat-cell"),
  steps: [
    {
      anchor: null,
      title: "Welcome to your franchise portal",
      body: "This 2-minute tour shows you around. Use Next and Back to move through it — skip anytime and replay it later from the ? button in the header.",
    },
    {
      anchor: widgetAnchor("dashboard-header"),
      title: "Your franchise",
      body: "Your franchise name and headline actions: request additional programs, or apply for a new franchise, right from here.",
    },
    {
      anchor: testIdAnchor("agreement-hero"),
      title: "Agreement & fees",
      body: "Your franchise agreement status, validity and fee schedule in one band — including upcoming instalments and anything overdue.",
    },
    {
      anchor: widgetAnchor("dashboard-stats"),
      title: "Your numbers",
      body: "Students, course instructors, orders and certificates at a glance. Amber chips mean something is waiting for you — click one to jump there.",
    },
    {
      anchor: widgetAnchor("dashboard-quick-access"),
      title: "Quick access",
      body: "Shortcuts to your daily work: students, instructors, orders and certificates.",
    },
    {
      anchor: widgetAnchor("pending-actions"),
      title: "Pending actions",
      body: "Everything waiting on you, collected in one list — instructor approvals, pending orders, certificate requests and dues.",
    },
    {
      anchor: widgetAnchor("recent-orders"),
      title: "Recent orders",
      body: "Your latest material orders with their status. “View all” takes you to the full order history.",
    },
    {
      anchor: testIdAnchor("franchise-rail"),
      title: "Your programs",
      body: "The programs running in your franchise. Request new ones any time.",
    },
    {
      anchor: navAnchor("/franchisee/students"),
      title: "Students",
      body: "Enrol and manage students, track their levels, and request their certificates.",
    },
    {
      anchor: navAnchor("/franchisee/course-instructors"),
      title: "Course Instructors",
      body: "Add and manage your instructors, and view or sign their agreements.",
    },
    {
      anchor: navAnchor("/franchisee/orders"),
      title: "Orders",
      body: "Order kits and materials from HQ, then track and pay for them here.",
    },
    {
      anchor: widgetAnchor("header-profile"),
      title: "Your profile",
      body: "Notifications sit just to the left; your profile, settings and logout are here. That's the tour — replay it anytime with the ? button.",
    },
  ],
});
