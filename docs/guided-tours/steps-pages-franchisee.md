# Page tours: franchisee (3 tours, all v1)

Encoded in `lib/tours/franchisee-page-tours.ts` — edit copy here first, then
mirror it there. Same anchor syntax as steps-pages-admin.md.

## `franchisee-students` — /franchisee/students — readyWhen `tab:manage`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Your students | Manage enrolments and certificates for your centre from this one page. |
| 2 | tab:manage | manage | Your roster | Every student you've enrolled is listed here, with their level and status. |
| 3 | table-actions | manage | Add students and request IDs | Add Student enrols a new child; Request IDs orders ID cards for students who need them. |
| 4 | table-search | manage | Search | Type a student's name to find them instantly. |
| 5 | table-filters | manage | Filter the list | Narrow by status, level, or ID-card status when the roster grows. |
| 6 | tab:certificates | certificates | Certificates | Request certificates for students who have completed a level — they're grouped by level so you can request in batches. |
| 7 | certificates-subtabs | certificates | Requests and history | Switch between raising new requests and checking the status of past ones. |
| 8 | null | | Ready to go | Start by adding your first student — everything else builds from there. Press ? anytime to replay this tour. |

## `franchisee-course-instructors` — /franchisee/course-instructors — readyWhen `testid:page-header-card`

This page's tabs are raw Radix Tabs — the three triggers carry hand-added
`data-tour="tab:…"` attributes so the tab-walk works.

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Course instructors | Manage the instructors who teach at your centre — from first application to a fully signed agreement. |
| 2 | page-actions | | Add a course instructor | Start here. Once you add an instructor, the admin team reviews and approves them, and an agreement is issued. |
| 3 | tab:regular | regular | Active & Training | Approved instructors live here. From a row you can check training progress, open the agreement, and countersign it once the instructor has signed — using your saved signature or by drawing one. |
| 4 | tab:approval | approval | Approval pending | Instructors you've added who are still waiting on admin approval appear here. |
| 5 | tab:ci-sessions | ci-sessions | Training sessions | See training sessions in your region and use Bulk Assign to book several instructors at once. |
| 6 | null | | The journey in short | Add, admin approves, agreement issued, instructor signs, you countersign — then they're active. Add your first instructor to begin. Press ? anytime to replay this tour. |

## `franchisee-orders` — /franchisee/orders — readyWhen `testid:page-header-card`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Material orders | Order student level materials and first-level kits here, and track every order till delivery. |
| 2 | page-actions | | Place a new request | New Material Request opens the order form — choose standard materials, a custom item, or a kit, and pay through Razorpay at the end. |
| 3 | orders-summary | | Your orders at a glance | Pending, shipped, delivered, and cancelled counts — a quick pulse on where things stand. |
| 4 | table-search | | Find an order | Search here, or use the status filter to see, say, only shipped orders. |
| 5 | null | | Invoices and GST | From an order's row you can view the invoice, or cancel while it's still allowed. Hover on the value column to see the GST breakdown. |
| 6 | null | | Ready to order | Place your first request whenever you need materials. Press ? anytime to replay this tour. |
