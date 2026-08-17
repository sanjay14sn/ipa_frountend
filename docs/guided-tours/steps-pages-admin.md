# Page tours: superadmin (8 tours, all v1)

Encoded in `lib/tours/admin-page-tours.ts` — edit copy here first, then mirror it
there. Anchor syntax: `tab:<v>` = tabs trigger; plain kebab = `[data-tour="…"]`;
`testid:x` = `[data-testid="x"]`; null = centered step. The Tab column is the
tab the engine activates before highlighting (toolbar steps always carry it so
Back-navigation re-activates the right tab).

## `admin-franchise-hub` — /admin/franchise — readyWhen `tab:franchises`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Welcome to the Franchise Hub | This is where you manage every franchise in the network — live records, new applications, program requests, and agreements. Let's take a quick look around. |
| 2 | tab:franchises | franchises | Your franchises | All live franchise records sit here, with their key details and status at a glance. |
| 3 | onboard-franchise | franchises | Onboard an existing franchise | Already have a franchise running outside the system? Use this to bring their record in without a fresh application. |
| 4 | table-search | franchises | Find a franchise fast | Type a name here to jump straight to a franchise, or use the filters alongside to narrow the list. |
| 5 | table-actions | franchises | Export the list | Export CSV downloads exactly what the table is currently showing — search and filters included. |
| 6 | tab:applications | applications | New applications | Review pending franchise applications here. Approving opens the payroll-terms dialog to launch them; rejecting requires a reason. |
| 7 | tab:programs | programs | Program requests | When an existing franchise wants to add another program, the request lands here for your decision. |
| 8 | tab:agreements | agreements | Agreements | Every franchise and program agreement, with signatures and validity, in one place — click a row for full details. Press the ? button anytime to replay this tour. |

## `admin-students` — /admin/students — readyWhen `tab:roster`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Students across the network | This page covers every student in every franchise — the full roster, lifecycle actions, ID cards, and certificates. |
| 2 | tab:roster | roster | The full roster | Search and filter students from any franchise here to answer questions in seconds. |
| 3 | table-actions | roster | Export in one click | Export CSV downloads exactly what your current search and filters show — handy for reports. |
| 4 | tab:lifecycle | lifecycle | Lifecycle | Keep an eye on at-risk, invalidated, extended, and reactivated students. "Run invalidation now" in the toolbar applies the rules immediately instead of waiting for the schedule. |
| 5 | tab:ids | ids | ID card requests | Requests arrive grouped by franchise. Expand a franchise to review its students and issue their ID cards. |
| 6 | tab:certificates | certificates | Certificate requests | Same idea for certificates — expand a franchise, review each request, and issue. |
| 7 | null | | Adding many students? | For mass onboarding, use Bulk Import to load students from a CSV in one go. Press ? anytime to see this tour again. |

## `admin-ci-hub` — /admin/course-instructors — readyWhen `tab:applications`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Course instructors | Everything about instructors lives here — applications, active CIs, training sessions, and agreements. |
| 2 | page-actions | | Onboard existing CI | Use this to record an instructor who is already teaching. It skips the application step — different from approving a new applicant. |
| 3 | tab:applications | applications | Applications | Review pending CI applications here. Approving builds the instructor's receivable plan, and rejection can't be undone — so check carefully. |
| 4 | tab:active | active | Active instructors | All CIs with valid agreements. Narrow by franchise or program, and Export CSV when you need the list. |
| 5 | tab:training | training | Training | Create, reschedule, and complete training sessions here, and record theory and practical marks. |
| 6 | ci-training-subtabs | training | Sessions and waiting list | Switch between Sessions & Assignments and the Waiting List — instructors still waiting for a seat show up in the second one. |
| 7 | tab:agreements | agreements | CI agreements | View, renew, suspend, or void instructor agreements from here. |
| 8 | tab:rejected | rejected | Rejected history | A read-only record of rejected applications, kept for reference. Press ? anytime to replay this tour. |

## `admin-operations-hq` — /admin/operations — readyWhen `tab:monitoring`

Superadmin only — staff admins get the v1 `staff-admin-operations` tour instead.

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Operations HQ | This is the HQ view of operations — orders, shipping, payments, inventory, and procurement across the whole network. |
| 2 | tab:monitoring | monitoring | Overview | Start here for a quick health check of operations before diving into a specific area. |
| 3 | tab:orders | orders | Orders | Verify incoming orders here — once verified, they move on to shipping. |
| 4 | table-actions | orders | Create an order for a franchise | As HQ you can raise an order on a franchise's behalf without collecting payment — the Create order button lives here. |
| 5 | tab:shipping | shipping | Shipping | Dispatch verified orders and track them until delivery. |
| 6 | tab:payments | payments | Payments | Record and reconcile payments against orders here. |
| 7 | tab:inventory | inventory | Inventory | Manage stock — add items and export movement history as CSV. |
| 8 | tab:procurement | procurement | Procurement | Suppliers, purchase orders, receipts, and replenishment each have their own sub-tab inside. Press ? anytime to replay this tour. |

## `admin-regional-operations` — /admin/regional-operations — readyWhen `page-header-extras`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Regional oversight | Watch each region's orders, shipping, payments, inventory, and monitoring — everything here is read-only. |
| 2 | page-header-extras | | Pick a region first | Choose a region from this selector — the tabs stay empty until you do. |
| 3 | tab:orders | orders | Orders | The selected region's orders, exactly as its admin sees them — view only. |
| 4 | tab:shipping | shipping | Shipping | Track that region's shipments and delivery progress. |
| 5 | tab:payments | payments | Payments (all regions) | This tab is deliberately unfiltered — it shows payments across every region so nothing slips through. |
| 6 | tab:inventory | inventory | Inventory | Stock levels and movements for the region, read-only. |
| 7 | tab:monitoring | monitoring | Monitoring | A quick health summary of the region. To actually act on anything, use the Operations page instead. Press ? anytime to replay this tour. |

## `admin-bulk-import` — /admin/bulk-import — readyWhen `testid:page-header-card`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Bulk import | Create many records at once by uploading a CSV file instead of entering them one by one. |
| 2 | bulk-import-tiles | | Choose what to import | Students is ready today — it takes you to the guided CSV import. Course Instructors and Franchises are coming soon. |
| 3 | null | | That's it | Open the Students tile whenever you have a batch to load. Press ? anytime to see this tour again. |

## `admin-programs` — /admin/programs — readyWhen `page-tabs-list`

Tab values are dynamic program IDs — never tab-walked. With zero programs the
header card doesn't render, so the tour silently never starts (accepted).

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Programs | Set up each program's structure, streams, and kit defaults here — this is the blueprint the rest of the system runs on. |
| 2 | page-actions | | Add a program | Add Program creates a new program, which then appears as its own tab on this page. |
| 3 | page-tabs-list | | One tab per program | Each of your programs is a tab here. Use the icon buttons to rename or delete a program. |
| 4 | program-sections | | Inside a program | Work through these sections in order: Basic details, CI Training, Kit Items, Franchise Kit, Certificate, and Agreement. |
| 5 | null | | You're set | Changes here flow to franchises and instructors across the network. Press ? anytime to replay this tour. |

## `admin-admins` — /admin/admins — readyWhen `page-actions`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Admin management | Create and maintain region-locked admins here. Superadmin stays the fallback owner for any region without one. |
| 2 | page-actions | | Add or refresh | Add admin creates a new regional admin; Refresh reloads the list. |
| 3 | table-search | | Search | Type a name to find an admin quickly. |
| 4 | null | | Row details | Expand any row to see contact and access details, and use the pencil to edit. |
| 5 | null | | What they see | A regional admin gets a single Operations workspace scoped to their region — nothing outside it. Press ? anytime to replay this tour. |
