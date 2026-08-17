# Tour: `staff-admin-operations` (v1)

Runs on `/admin/operations` (the staff admin's only page — the layout forces them
here). Ready when `[data-tour="tab:monitoring"]` exists. 10 steps; the tab steps
activate their tab before highlighting, so the content changes behind the overlay.
Encoded in `lib/tours/staff-admin-tour.ts` — edit copy here first, then mirror it there.

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | _(centered)_ | — | Welcome to IPA Operations | Your whole workspace is this Operations hub, organised into six tabs. This quick tour walks through each one — use Next and Back; skip anytime and replay it later from the ? button in the header. |
| 2 | `tab:monitoring` | monitoring | Overview | Your live monitoring view — the state of orders, stock and payments in your region at a glance. This is where you land each day. |
| 3 | `tab:orders` | orders | Orders | Franchise orders arrive here. Verify paid orders and manage allocation — verified orders move on to the Shipping tab. |
| 4 | `tab:shipping` | shipping | Shipping | Dispatch and track verified orders through to delivery. |
| 5 | `tab:payments` | payments | Payments | Record and reconcile order payments for your region. |
| 6 | `tab:inventory` | inventory | Inventory | Your warehouse stock: levels, adjustments and movement history. |
| 7 | `tab:procurement` | procurement | Procurement | Request stock from HQ into your warehouse and track receipts. |
| 8 | `header-notifications` | — | Notifications | Real-time alerts about orders and payments land here. |
| 9 | `header-profile` | — | Your profile | Profile & settings and logout live here. |
| 10 | _(centered)_ | monitoring | That's it | You're back on the Overview tab. Replay this tour anytime from the ? button in the header. |
