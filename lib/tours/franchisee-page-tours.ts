import {
  freezeTour,
  tabAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/**
 * Franchisee per-page mini-tours. Copy source of truth:
 * docs/guided-tours/steps-pages-franchisee.md.
 */

export const FRANCHISEE_STUDENTS_TOUR = freezeTour({
  key: "franchisee-students",
  version: 1,
  page: "/franchisee/students",
  readyWhen: tabAnchor("manage"),
  tabs: ["manage", "certificates"],
  steps: [
    {
      anchor: null,
      title: "Your students",
      body: "Manage enrolments and certificates for your centre from this one page.",
    },
    {
      anchor: tabAnchor("manage"),
      tab: "manage",
      title: "Your roster",
      body: "Every student you've enrolled is listed here, with their level and status.",
    },
    {
      anchor: widgetAnchor("table-actions"),
      tab: "manage",
      title: "Add students and request IDs",
      body: "Add Student enrols a new child; Request IDs orders ID cards for students who need them.",
    },
    {
      anchor: widgetAnchor("table-search"),
      tab: "manage",
      title: "Search",
      body: "Type a student's name to find them instantly.",
    },
    {
      anchor: widgetAnchor("table-filters"),
      tab: "manage",
      title: "Filter the list",
      body: "Narrow by status, level, or ID-card status when the roster grows.",
    },
    {
      anchor: tabAnchor("certificates"),
      tab: "certificates",
      title: "Certificates",
      body: "Request certificates for students who have completed a level — they're grouped by level so you can request in batches.",
    },
    {
      anchor: widgetAnchor("certificates-subtabs"),
      tab: "certificates",
      title: "Requests and history",
      body: "Switch between raising new requests and checking the status of past ones.",
    },
    {
      anchor: null,
      title: "Ready to go",
      body: "Start by adding your first student — everything else builds from there. Press ? anytime to replay this tour.",
    },
  ],
});

// This page's tabs are raw Radix Tabs; the three triggers carry hand-added
// data-tour="tab:…" attributes (CourseInstructorTabs.tsx) so the walk works.
export const FRANCHISEE_COURSE_INSTRUCTORS_TOUR = freezeTour({
  key: "franchisee-course-instructors",
  version: 1,
  page: "/franchisee/course-instructors",
  readyWhen: testIdAnchor("page-header-card"),
  tabs: ["regular", "approval", "ci-sessions"],
  steps: [
    {
      anchor: null,
      title: "Course instructors",
      body: "Manage the instructors who teach at your centre — from first application to a fully signed agreement.",
    },
    {
      anchor: widgetAnchor("page-actions"),
      title: "Add a course instructor",
      body: "Start here. Once you add an instructor, the admin team reviews and approves them, and an agreement is issued.",
    },
    {
      anchor: tabAnchor("regular"),
      tab: "regular",
      title: "Active & Training",
      body: "Approved instructors live here. From a row you can check training progress, open the agreement, and countersign it once the instructor has signed — using your saved signature or by drawing one.",
    },
    {
      anchor: tabAnchor("approval"),
      tab: "approval",
      title: "Approval pending",
      body: "Instructors you've added who are still waiting on admin approval appear here.",
    },
    {
      anchor: tabAnchor("ci-sessions"),
      tab: "ci-sessions",
      title: "Training sessions",
      body: "See training sessions in your region and use Bulk Assign to book several instructors at once.",
    },
    {
      anchor: null,
      title: "The journey in short",
      body: "Add, admin approves, agreement issued, instructor signs, you countersign — then they're active. Add your first instructor to begin. Press ? anytime to replay this tour.",
    },
  ],
});

export const FRANCHISEE_ORDERS_TOUR = freezeTour({
  key: "franchisee-orders",
  version: 1,
  page: "/franchisee/orders",
  readyWhen: testIdAnchor("page-header-card"),
  steps: [
    {
      anchor: null,
      title: "Material orders",
      body: "Order student level materials and first-level kits here, and track every order till delivery.",
    },
    {
      anchor: widgetAnchor("page-actions"),
      title: "Place a new request",
      body: "New Material Request opens the order form — choose standard materials, a custom item, or a kit, and pay through Razorpay at the end.",
    },
    {
      anchor: widgetAnchor("orders-summary"),
      title: "Your orders at a glance",
      body: "Pending, shipped, delivered, and cancelled counts — a quick pulse on where things stand.",
    },
    {
      anchor: widgetAnchor("table-search"),
      title: "Find an order",
      body: "Search here, or use the status filter to see, say, only shipped orders.",
    },
    {
      anchor: null,
      title: "Invoices and GST",
      body: "From an order's row you can view the invoice, or cancel while it's still allowed. Hover on the value column to see the GST breakdown.",
    },
    {
      anchor: null,
      title: "Ready to order",
      body: "Place your first request whenever you need materials. Press ? anytime to replay this tour.",
    },
  ],
});
