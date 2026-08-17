import {
  freezeTour,
  tabAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/**
 * Superadmin per-page mini-tours. Copy source of truth:
 * docs/guided-tours/steps-pages-admin.md.
 *
 * Toolbar steps (table-search/table-actions/…) sit right after their tab's own
 * step AND carry the same `tab` — see the ordering rule in the README.
 */

export const ADMIN_FRANCHISE_HUB_TOUR = freezeTour({
  key: "admin-franchise-hub",
  version: 1,
  page: "/admin/franchise",
  readyWhen: tabAnchor("franchises"),
  tabs: ["franchises", "applications", "programs", "agreements"],
  steps: [
    {
      anchor: null,
      title: "Welcome to the Franchise Hub",
      body: "This is where you manage every franchise in the network — live records, new applications, program requests, and agreements. Let's take a quick look around.",
    },
    {
      anchor: tabAnchor("franchises"),
      tab: "franchises",
      title: "Your franchises",
      body: "All live franchise records sit here, with their key details and status at a glance.",
    },
    {
      anchor: widgetAnchor("onboard-franchise"),
      tab: "franchises",
      title: "Onboard an existing franchise",
      body: "Already have a franchise running outside the system? Use this to bring their record in without a fresh application.",
    },
    {
      anchor: widgetAnchor("table-search"),
      tab: "franchises",
      title: "Find a franchise fast",
      body: "Type a name here to jump straight to a franchise, or use the filters alongside to narrow the list.",
    },
    {
      anchor: widgetAnchor("table-actions"),
      tab: "franchises",
      title: "Export the list",
      body: "Export CSV downloads exactly what the table is currently showing — search and filters included.",
    },
    {
      anchor: tabAnchor("applications"),
      tab: "applications",
      title: "New applications",
      body: "Review pending franchise applications here. Approving opens the payroll-terms dialog to launch them; rejecting requires a reason.",
    },
    {
      anchor: tabAnchor("programs"),
      tab: "programs",
      title: "Program requests",
      body: "When an existing franchise wants to add another program, the request lands here for your decision.",
    },
    {
      anchor: tabAnchor("agreements"),
      tab: "agreements",
      title: "Agreements",
      body: "Every franchise and program agreement, with signatures and validity, in one place — click a row for full details. Press the ? button anytime to replay this tour.",
    },
  ],
});

export const ADMIN_STUDENTS_TOUR = freezeTour({
  key: "admin-students",
  version: 1,
  page: "/admin/students",
  readyWhen: tabAnchor("roster"),
  tabs: ["roster", "lifecycle", "ids", "certificates"],
  steps: [
    {
      anchor: null,
      title: "Students across the network",
      body: "This page covers every student in every franchise — the full roster, lifecycle actions, ID cards, and certificates.",
    },
    {
      anchor: tabAnchor("roster"),
      tab: "roster",
      title: "The full roster",
      body: "Search and filter students from any franchise here to answer questions in seconds.",
    },
    {
      anchor: widgetAnchor("table-actions"),
      tab: "roster",
      title: "Export in one click",
      body: "Export CSV downloads exactly what your current search and filters show — handy for reports.",
    },
    {
      anchor: tabAnchor("lifecycle"),
      tab: "lifecycle",
      title: "Lifecycle",
      body: "Keep an eye on at-risk, invalidated, extended, and reactivated students. “Run invalidation now” in the toolbar applies the rules immediately instead of waiting for the schedule.",
    },
    {
      anchor: tabAnchor("ids"),
      tab: "ids",
      title: "ID card requests",
      body: "Requests arrive grouped by franchise. Expand a franchise to review its students and issue their ID cards.",
    },
    {
      anchor: tabAnchor("certificates"),
      tab: "certificates",
      title: "Certificate requests",
      body: "Same idea for certificates — expand a franchise, review each request, and issue.",
    },
    {
      anchor: null,
      title: "Adding many students?",
      body: "For mass onboarding, use Bulk Import to load students from a CSV in one go. Press ? anytime to see this tour again.",
    },
  ],
});

export const ADMIN_CI_HUB_TOUR = freezeTour({
  key: "admin-ci-hub",
  version: 1,
  page: "/admin/course-instructors",
  readyWhen: tabAnchor("applications"),
  tabs: ["applications", "active", "training", "agreements", "rejected"],
  steps: [
    {
      anchor: null,
      title: "Course instructors",
      body: "Everything about instructors lives here — applications, active CIs, training sessions, and agreements.",
    },
    {
      anchor: widgetAnchor("page-actions"),
      title: "Onboard existing CI",
      body: "Use this to record an instructor who is already teaching. It skips the application step — different from approving a new applicant.",
    },
    {
      anchor: tabAnchor("applications"),
      tab: "applications",
      title: "Applications",
      body: "Review pending CI applications here. Approving builds the instructor's receivable plan, and rejection can't be undone — so check carefully.",
    },
    {
      anchor: tabAnchor("active"),
      tab: "active",
      title: "Active instructors",
      body: "All CIs with valid agreements. Narrow by franchise or program, and Export CSV when you need the list.",
    },
    {
      anchor: tabAnchor("training"),
      tab: "training",
      title: "Training",
      body: "Create, reschedule, and complete training sessions here, and record theory and practical marks.",
    },
    {
      anchor: widgetAnchor("ci-training-subtabs"),
      tab: "training",
      title: "Sessions and waiting list",
      body: "Switch between Sessions & Assignments and the Waiting List — instructors still waiting for a seat show up in the second one.",
    },
    {
      anchor: tabAnchor("agreements"),
      tab: "agreements",
      title: "CI agreements",
      body: "View, renew, suspend, or void instructor agreements from here.",
    },
    {
      anchor: tabAnchor("rejected"),
      tab: "rejected",
      title: "Rejected history",
      body: "A read-only record of rejected applications, kept for reference. Press ? anytime to replay this tour.",
    },
  ],
});

export const ADMIN_OPERATIONS_HQ_TOUR = freezeTour({
  key: "admin-operations-hq",
  version: 1,
  page: "/admin/operations",
  readyWhen: tabAnchor("monitoring"),
  tabs: [
    "monitoring",
    "orders",
    "shipping",
    "payments",
    "inventory",
    "procurement",
  ],
  steps: [
    {
      anchor: null,
      title: "Operations HQ",
      body: "This is the HQ view of operations — orders, shipping, payments, inventory, and procurement across the whole network.",
    },
    {
      anchor: tabAnchor("monitoring"),
      tab: "monitoring",
      title: "Overview",
      body: "Start here for a quick health check of operations before diving into a specific area.",
    },
    {
      anchor: tabAnchor("orders"),
      tab: "orders",
      title: "Orders",
      body: "Verify incoming orders here — once verified, they move on to shipping.",
    },
    {
      anchor: widgetAnchor("table-actions"),
      tab: "orders",
      title: "Create an order for a franchise",
      body: "As HQ you can raise an order on a franchise's behalf without collecting payment — the Create order button lives here.",
    },
    {
      anchor: tabAnchor("shipping"),
      tab: "shipping",
      title: "Shipping",
      body: "Dispatch verified orders and track them until delivery.",
    },
    {
      anchor: tabAnchor("payments"),
      tab: "payments",
      title: "Payments",
      body: "Record and reconcile payments against orders here.",
    },
    {
      anchor: tabAnchor("inventory"),
      tab: "inventory",
      title: "Inventory",
      body: "Manage stock — add items and export movement history as CSV.",
    },
    {
      anchor: tabAnchor("procurement"),
      tab: "procurement",
      title: "Procurement",
      body: "Suppliers, purchase orders, receipts, and replenishment each have their own sub-tab inside. Press ? anytime to replay this tour.",
    },
  ],
});

export const ADMIN_REGIONAL_OPERATIONS_TOUR = freezeTour({
  key: "admin-regional-operations",
  version: 1,
  page: "/admin/regional-operations",
  readyWhen: widgetAnchor("page-header-extras"),
  tabs: ["orders", "shipping", "payments", "inventory", "monitoring"],
  steps: [
    {
      anchor: null,
      title: "Regional oversight",
      body: "Watch each region's orders, shipping, payments, inventory, and monitoring — everything here is read-only.",
    },
    {
      anchor: widgetAnchor("page-header-extras"),
      title: "Pick a region first",
      body: "Choose a region from this selector — the tabs stay empty until you do.",
    },
    {
      anchor: tabAnchor("orders"),
      tab: "orders",
      title: "Orders",
      body: "The selected region's orders, exactly as its admin sees them — view only.",
    },
    {
      anchor: tabAnchor("shipping"),
      tab: "shipping",
      title: "Shipping",
      body: "Track that region's shipments and delivery progress.",
    },
    {
      anchor: tabAnchor("payments"),
      tab: "payments",
      title: "Payments (all regions)",
      body: "This tab is deliberately unfiltered — it shows payments across every region so nothing slips through.",
    },
    {
      anchor: tabAnchor("inventory"),
      tab: "inventory",
      title: "Inventory",
      body: "Stock levels and movements for the region, read-only.",
    },
    {
      anchor: tabAnchor("monitoring"),
      tab: "monitoring",
      title: "Monitoring",
      body: "A quick health summary of the region. To actually act on anything, use the Operations page instead. Press ? anytime to replay this tour.",
    },
  ],
});

export const ADMIN_BULK_IMPORT_TOUR = freezeTour({
  key: "admin-bulk-import",
  version: 1,
  page: "/admin/bulk-import",
  readyWhen: testIdAnchor("page-header-card"),
  steps: [
    {
      anchor: null,
      title: "Bulk import",
      body: "Create many records at once by uploading a CSV file instead of entering them one by one.",
    },
    {
      anchor: widgetAnchor("bulk-import-tiles"),
      title: "Choose what to import",
      body: "Students is ready today — it takes you to the guided CSV import. Course Instructors and Franchises are coming soon.",
    },
    {
      anchor: null,
      title: "That's it",
      body: "Open the Students tile whenever you have a batch to load. Press ? anytime to see this tour again.",
    },
  ],
});

// Programs: tab values are dynamic program IDs — never tab-walked. With zero
// programs the header card doesn't render, so this tour silently never starts.
export const ADMIN_PROGRAMS_TOUR = freezeTour({
  key: "admin-programs",
  version: 1,
  page: "/admin/programs",
  readyWhen: widgetAnchor("page-tabs-list"),
  steps: [
    {
      anchor: null,
      title: "Programs",
      body: "Set up each program's structure, streams, and kit defaults here — this is the blueprint the rest of the system runs on.",
    },
    {
      anchor: widgetAnchor("page-actions"),
      title: "Add a program",
      body: "Add Program creates a new program, which then appears as its own tab on this page.",
    },
    {
      anchor: widgetAnchor("page-tabs-list"),
      title: "One tab per program",
      body: "Each of your programs is a tab here. Use the icon buttons to rename or delete a program.",
    },
    {
      anchor: widgetAnchor("program-sections"),
      title: "Inside a program",
      body: "Work through these sections in order: Basic details, CI Training, Kit Items, Franchise Kit, Certificate, and Agreement.",
    },
    {
      anchor: null,
      title: "You're set",
      body: "Changes here flow to franchises and instructors across the network. Press ? anytime to replay this tour.",
    },
  ],
});

export const ADMIN_ADMINS_TOUR = freezeTour({
  key: "admin-admins",
  version: 1,
  page: "/admin/admins",
  readyWhen: widgetAnchor("page-actions"),
  steps: [
    {
      anchor: null,
      title: "Admin management",
      body: "Create and maintain region-locked admins here. Superadmin stays the fallback owner for any region without one.",
    },
    {
      anchor: widgetAnchor("page-actions"),
      title: "Add or refresh",
      body: "Add admin creates a new regional admin; Refresh reloads the list.",
    },
    {
      anchor: widgetAnchor("table-search"),
      title: "Search",
      body: "Type a name to find an admin quickly.",
    },
    {
      anchor: null,
      title: "Row details",
      body: "Expand any row to see contact and access details, and use the pencil to edit.",
    },
    {
      anchor: null,
      title: "What they see",
      body: "A regional admin gets a single Operations workspace scoped to their region — nothing outside it. Press ? anytime to replay this tour.",
    },
  ],
});
