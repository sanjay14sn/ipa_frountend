import { freezeTour, tabAnchor, widgetAnchor } from "./tour-types";

/**
 * Staff (regional) admins live on the single /admin/operations page — the tour
 * walks its tabs, activating each behind the overlay.
 *
 * KEEP IN SYNC with the `TABS` list in app/admin/operations/page.tsx (the tour
 * cannot import it — `@/app/*` imports are lint-banned). The registry test
 * asserts every `tab:` anchor is in this list.
 */
export const STAFF_ADMIN_OPERATIONS_TABS = Object.freeze([
  "monitoring",
  "orders",
  "shipping",
  "payments",
  "inventory",
  "procurement",
] as const);

/** Copy source of truth: docs/guided-tours/steps-staff-admin.md */
export const STAFF_ADMIN_TOUR = freezeTour({
  key: "staff-admin-operations",
  version: 1,
  page: "/admin/operations",
  readyWhen: tabAnchor("monitoring"),
  tabs: STAFF_ADMIN_OPERATIONS_TABS,
  steps: [
    {
      anchor: null,
      title: "Welcome to IPA Operations",
      body: "Your whole workspace is this Operations hub, organised into six tabs. This quick tour walks through each one — use Next and Back; skip anytime and replay it later from the ? button in the header.",
    },
    {
      anchor: tabAnchor("monitoring"),
      tab: "monitoring",
      title: "Overview",
      body: "Your live monitoring view — the state of orders, stock and payments in your region at a glance. This is where you land each day.",
    },
    {
      anchor: tabAnchor("orders"),
      tab: "orders",
      title: "Orders",
      body: "Franchise orders arrive here. Verify paid orders and manage allocation — verified orders move on to the Shipping tab.",
    },
    {
      anchor: tabAnchor("shipping"),
      tab: "shipping",
      title: "Shipping",
      body: "Dispatch and track verified orders through to delivery.",
    },
    {
      anchor: tabAnchor("payments"),
      tab: "payments",
      title: "Payments",
      body: "Record and reconcile order payments for your region.",
    },
    {
      anchor: tabAnchor("inventory"),
      tab: "inventory",
      title: "Inventory",
      body: "Your warehouse stock: levels, adjustments and movement history.",
    },
    {
      anchor: tabAnchor("procurement"),
      tab: "procurement",
      title: "Procurement",
      body: "Request stock from HQ into your warehouse and track receipts.",
    },
    {
      anchor: widgetAnchor("header-notifications"),
      title: "Notifications",
      body: "Real-time alerts about orders and payments land here.",
    },
    {
      anchor: widgetAnchor("header-profile"),
      title: "Your profile",
      body: "Profile & settings and logout live here.",
    },
    {
      anchor: null,
      tab: "monitoring",
      title: "That's it",
      body: "You're back on the Overview tab. Replay this tour anytime from the ? button in the header.",
    },
  ],
});
