# Tour: `franchisee-dashboard` (v1)

Runs on `/franchisee/dashboard` for operational franchisees (pre-agreement funnel
users are excluded). Ready when `[data-testid="stat-cell"]` exists. 12 steps.
Encoded in `lib/tours/franchisee-tour.ts` — edit copy here first, then mirror it there.

| # | Anchor | Title | Copy |
|---|---|---|---|
| 1 | _(centered)_ | Welcome to your franchise portal | This 2-minute tour shows you around. Use Next and Back to move through it — skip anytime and replay it later from the ? button in the header. |
| 2 | `dashboard-header` | Your franchise | Your franchise name and headline actions: request additional programs, or apply for a new franchise, right from here. |
| 3 | `agreement-hero` _(existing testid)_ | Agreement & fees | Your franchise agreement status, validity and fee schedule in one band — including upcoming instalments and anything overdue. |
| 4 | `dashboard-stats` | Your numbers | Students, course instructors, orders and certificates at a glance. Amber chips mean something is waiting for you — click one to jump there. |
| 5 | `dashboard-quick-access` | Quick access | Shortcuts to your daily work: students, instructors, orders and certificates. |
| 6 | `pending-actions` | Pending actions | Everything waiting on you, collected in one list — instructor approvals, pending orders, certificate requests and dues. |
| 7 | `recent-orders` | Recent orders | Your latest material orders with their status. "View all" takes you to the full order history. |
| 8 | `franchise-rail` _(existing testid)_ | Your programs | The programs running in your franchise. Request new ones any time. |
| 9 | `nav:/franchisee/students` | Students | Enrol and manage students, track their levels, and request their certificates. |
| 10 | `nav:/franchisee/course-instructors` | Course Instructors | Add and manage your instructors, and view or sign their agreements. |
| 11 | `nav:/franchisee/orders` | Orders | Order kits and materials from HQ, then track and pay for them here. |
| 12 | `header-profile` | Your profile | Notifications sit just to the left; your profile, settings and logout are here. That's the tour — replay it anytime with the ? button. |
